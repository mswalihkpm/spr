export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { ExcelImportRow, ExcelValidationIssue } from '@/types';
import { isValidSprId, normalizeSprId } from '@/lib/spr-id';

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const { rows, action, fileName } = (await req.json()) as {
      rows: (ExcelImportRow & { [key: string]: any })[];
      action: 'VALIDATE' | 'CONFIRM_IMPORT';
      fileName?: string;
    };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No data rows provided in upload.' }, { status: 400 });
    }

    // Load reference data from DB
    const [classes, schools, currentYear, existingStudents] = await Promise.all([
      prisma.academicClass.findMany({ where: { active: true } }),
      prisma.school.findMany({ where: { active: true } }),
      prisma.academicYear.findFirst({ where: { isCurrent: true } }),
      prisma.student.findMany({ select: { studentId: true, sprStudentId: true } }),
    ]);

    if (!currentYear) {
      return NextResponse.json({ error: 'No active academic year configured in system.' }, { status: 400 });
    }

    const classMap = new Map(classes.map((c) => [c.name.toLowerCase().trim(), c.id]));
    // Also support shortcuts like "8" -> "Class 8", "10" -> "Class 10", "+1" -> "Class +1"
    classes.forEach((c) => {
      const shortName = c.name.toLowerCase().replace('class', '').trim();
      classMap.set(shortName, c.id);
    });

    const schoolMap = new Map(schools.map((s) => [s.name.toLowerCase().trim(), s.id]));
    schools.forEach((s) => {
      schoolMap.set(s.code.toLowerCase().trim(), s.id);
    });

    const existingIdSet = new Set(existingStudents.map((s) => s.studentId.toLowerCase()));
    const existingSprIdSet = new Set(
      existingStudents.map((s) => (s.sprStudentId ? s.sprStudentId.toLowerCase() : '')).filter(Boolean)
    );

    let maxSprNumber = 0;
    for (const s of existingStudents) {
      if (s.sprStudentId) {
        const match = s.sprStudentId.trim().match(/^SPR(\d+)$/i);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSprNumber) {
            maxSprNumber = num;
          }
        }
      }
    }

    const seenBatchIds = new Set<string>();
    const seenBatchSprIds = new Set<string>();

    const issues: ExcelValidationIssue[] = [];
    const validRecords: {
      studentId: string;
      sprStudentId: string;
      fullName: string;
      classId: string;
      schoolId: string;
      division: string;
      academicYearId: string;
    }[] = [];

    let autoSprCounter = maxSprNumber;

    // Validation pass
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Accounting for header row (Row 1)

      const name = (row.studentName || row.name || row.fullName || '').trim();
      const rawClass = (row.class || row.grade || '').toString().trim();
      const rawSchool = (row.school || row.institution || '').toString().trim();
      const rawDivision = (row.division || row.batch || 'A').toString().trim().toUpperCase();
      let studentId = (row.studentId || row.id || '').toString().trim();
      let rawSprId = (
        row['SPR ID'] ||
        row['SPR Student ID'] ||
        row['sprStudentId'] ||
        row['sprId'] ||
        row.sprStudentId ||
        row.sprId ||
        ''
      ).toString().trim();

      // 1. Validate Name
      if (!name) {
        issues.push({
          rowNumber: rowNum,
          field: 'Student Name',
          value: name,
          message: 'Student name is missing or empty.',
          severity: 'ERROR',
        });
      }

      // 2. Validate Class
      const matchedClassId = classMap.get(rawClass.toLowerCase());
      if (!rawClass || !matchedClassId) {
        issues.push({
          rowNumber: rowNum,
          field: 'Class',
          value: rawClass,
          message: `Class "${rawClass}" does not match any active class (e.g. Class 8, Class 9, Class 10, Class +1, Class +2).`,
          severity: 'ERROR',
        });
      }

      // 3. Validate School
      const matchedSchoolId = schoolMap.get(rawSchool.toLowerCase());
      if (!rawSchool || !matchedSchoolId) {
        issues.push({
          rowNumber: rowNum,
          field: 'School',
          value: rawSchool,
          message: `School "${rawSchool}" does not match any active school (e.g. GBHS Malappuram, GBHSS Malappuram, CM Academy, Ma'din Higher Secondary School, DUHSS Panakkad).`,
          severity: 'ERROR',
        });
      }

      // 4. Generate or Validate Student ID (Internal Code)
      if (!studentId) {
        // Auto generate ID based on timestamp and row
        studentId = `MSOE-2026-${String(existingStudents.length + i + 1).padStart(3, '0')}`;
      } else {
        if (existingIdSet.has(studentId.toLowerCase())) {
          issues.push({
            rowNumber: rowNum,
            field: 'Student ID',
            value: studentId,
            message: `Student ID "${studentId}" already exists in the system.`,
            severity: 'ERROR',
          });
        }
        if (seenBatchIds.has(studentId.toLowerCase())) {
          issues.push({
            rowNumber: rowNum,
            field: 'Student ID',
            value: studentId,
            message: `Duplicate Student ID "${studentId}" found multiple times in this Excel file.`,
            severity: 'ERROR',
          });
        }
        seenBatchIds.add(studentId.toLowerCase());
      }

      // 5. Generate or Validate SPR Student ID
      let finalSprId = '';
      if (rawSprId) {
        const normalized = normalizeSprId(rawSprId);
        if (!isValidSprId(normalized)) {
          issues.push({
            rowNumber: rowNum,
            field: 'SPR ID',
            value: rawSprId,
            message: `Invalid SPR Student ID format "${rawSprId}". Format must be "SPR" followed by at least 4 digits (e.g. SPR0001).`,
            severity: 'ERROR',
          });
        } else if (existingSprIdSet.has(normalized.toLowerCase())) {
          issues.push({
            rowNumber: rowNum,
            field: 'SPR ID',
            value: rawSprId,
            message: `SPR Student ID "${normalized}" already exists. Please use a unique ID.`,
            severity: 'ERROR',
          });
        } else if (seenBatchSprIds.has(normalized.toLowerCase())) {
          issues.push({
            rowNumber: rowNum,
            field: 'SPR ID',
            value: rawSprId,
            message: `Duplicate SPR Student ID "${normalized}" found multiple times in this Excel file.`,
            severity: 'ERROR',
          });
        } else {
          finalSprId = normalized;
          seenBatchSprIds.add(normalized.toLowerCase());
        }
      } else {
        // Auto-generate next sequential SPR ID
        let candidate = '';
        do {
          autoSprCounter++;
          candidate = `SPR${String(autoSprCounter).padStart(4, '0')}`;
        } while (
          existingSprIdSet.has(candidate.toLowerCase()) ||
          seenBatchSprIds.has(candidate.toLowerCase())
        );
        finalSprId = candidate;
        seenBatchSprIds.add(candidate.toLowerCase());
      }

      if (name && matchedClassId && matchedSchoolId && !issues.some((iss) => iss.rowNumber === rowNum)) {
        validRecords.push({
          studentId,
          sprStudentId: finalSprId,
          fullName: name,
          classId: matchedClassId,
          schoolId: matchedSchoolId,
          division: rawDivision || 'A',
          academicYearId: currentYear.id,
        });
      }
    }

    // If only validating
    if (action === 'VALIDATE') {
      return NextResponse.json({
        success: true,
        totalRows: rows.length,
        validRows: validRecords.length,
        errorRows: rows.length - validRecords.length,
        issues,
        canImport: issues.length === 0,
        validRecordsPreview: validRecords.slice(0, 10),
      });
    }

    // If confirming import
    if (action === 'CONFIRM_IMPORT') {
      if (issues.length > 0) {
        return NextResponse.json({
          error: `Cannot import: Found ${issues.length} validation errors in the dataset. Please fix before importing.`,
          issues,
        }, { status: 400 });
      }

      // Insert all students in one efficient batch
      const result = await prisma.student.createMany({
        data: validRecords.map((item) => ({
          studentId: item.studentId,
          sprStudentId: item.sprStudentId,
          fullName: item.fullName,
          classId: item.classId,
          schoolId: item.schoolId,
          division: item.division,
          academicYearId: item.academicYearId,
          status: 'ACTIVE',
        })),
      });

      const createdCount = result.count;
      // Log import history
      await prisma.importHistory.create({
        data: {
          fileName: fileName || 'students_bulk_import.xlsx',
          fileType: 'EXCEL',
          recordsCount: rows.length,
          successCount: createdCount,
          errorCount: 0,
          uploadedById: user?.id,
        },
      });

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'IMPORT',
        entity: 'Student',
        newValue: { importedCount: createdCount, fileName },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully imported ${createdCount} students into the database.`,
        importedCount: createdCount,
      });
    }

    return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
  } catch (error: any) {
    console.error('Bulk import error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process bulk import.' }, { status: 500 });
  }
}
