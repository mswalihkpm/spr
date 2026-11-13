export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { invalidateEngineCache, onInvalidateEngine } from '@/lib/spr-engine';
import { syncStudentEarnings } from '@/lib/student-earnings';
import { getCachedAcademicClasses } from '@/lib/academic-cache';

let cachedFieldCollectionCat: any = null;
onInvalidateEngine(() => {
  cachedFieldCollectionCat = null;
});

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse || !user) {
      return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const status = searchParams.get('status') || 'ALL'; // ALL, RECORDED, NOT_RECORDED
    const driveName = (searchParams.get('driveName') || '').trim();

    // 1. Fetch or ensure Category with memory caching
    let category = cachedFieldCollectionCat;
    if (!category) {
      category = await prisma.category.findUnique({
        where: { code: 'FIELD_COLLECTION' },
        include: { subcategories: true },
      });

      if (!category) {
        category = await prisma.category.create({
          data: {
            code: 'FIELD_COLLECTION',
            name: 'Field Collection',
            description: 'Field collection campaigns, student contribution milestones, and social drives',
            icon: 'coins',
            isSystem: true,
            active: true,
            displayOrder: 9,
            defaultWeight: 1.0,
            includeInSPR: true,
          },
          include: { subcategories: true },
        });
      }
      cachedFieldCollectionCat = category;
    }

    // 2. Build student query
    const studentWhere: any = {
      status: 'ACTIVE',
    };

    if (classId && classId !== 'ALL') {
      studentWhere.classId = classId;
    }

    if (search) {
      studentWhere.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { studentId: { contains: search, mode: 'insensitive' } },
        { sprStudentId: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 3. Parallel fetch: classes from memory cache and students concurrently
    const [classes, students] = await Promise.all([
      getCachedAcademicClasses(),
      prisma.student.findMany({
        where: studentWhere,
        select: {
          id: true,
          studentId: true,
          sprStudentId: true,
        fullName: true,
        division: true,
        photoUrl: true,
        class: {
          select: {
            id: true,
            name: true,
            numericGrade: true,
          },
        },
        performanceRecords: {
          where: {
            categoryId: category.id,
            ...(driveName ? { remarks: { contains: driveName, mode: 'insensitive' } } : {}),
          },
          orderBy: { date: 'desc' },
          select: {
            id: true,
            obtainedScore: true,
            maxScore: true,
            percentage: true,
            remarks: true,
            date: true,
            updatedAt: true,
          },
        },
      },
      orderBy: [
        { class: { numericGrade: 'asc' } },
        { division: 'asc' },
        { fullName: 'asc' },
      ],
    }),
  ]);

    // 5. Structure student items with total points
    const mappedStudents = students.map((s) => {
      const records = s.performanceRecords || [];
      const totalPoints = Number(
        records.reduce((acc, curr) => acc + (Number(curr.obtainedScore) || 0), 0).toFixed(2)
      );
      const latestRecord = records[0] || null;

      return {
        id: s.id,
        studentId: s.studentId,
        sprStudentId: s.sprStudentId,
        fullName: s.fullName,
        division: s.division,
        photoUrl: s.photoUrl,
        class: s.class,
        records,
        totalPoints,
        latestRecord,
      };
    });

    // Filter by status if requested
    let filteredStudents = mappedStudents;
    if (status === 'RECORDED') {
      filteredStudents = mappedStudents.filter((s) => s.totalPoints > 0 || s.records.length > 0);
    } else if (status === 'NOT_RECORDED') {
      filteredStudents = mappedStudents.filter((s) => s.totalPoints === 0 && s.records.length === 0);
    }

    // 6. Aggregate Stats
    const totalStudentsCount = mappedStudents.length;
    const recordedStudents = mappedStudents.filter((s) => s.totalPoints > 0 || s.records.length > 0);
    const recordedCount = recordedStudents.length;
    const missingCount = totalStudentsCount - recordedCount;
    const totalPointsCollected = Number(
      mappedStudents.reduce((acc, curr) => acc + curr.totalPoints, 0).toFixed(2)
    );
    const averagePoints =
      recordedCount > 0 ? Number((totalPointsCollected / recordedCount).toFixed(2)) : 0;
    const highestPoints =
      mappedStudents.length > 0
        ? Math.max(...mappedStudents.map((s) => s.totalPoints), 0)
        : 0;

    return NextResponse.json({
      category: {
        id: category.id,
        code: category.code,
        name: category.name,
        description: category.description,
        icon: category.icon,
        subcategories: category.subcategories,
      },
      classes,
      students: filteredStudents,
      stats: {
        totalStudentsCount,
        recordedCount,
        missingCount,
        totalPointsCollected,
        averagePoints,
        highestPoints,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/field-collection:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch field collection data.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse || !user) {
      return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { entries, remarks: defaultRemarks, driveName } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: 'At least one field collection entry is required.' },
        { status: 400 }
      );
    }

    // Get Category and Academic Year
    const category = await prisma.category.findUnique({
      where: { code: 'FIELD_COLLECTION' },
      include: { subcategories: true },
    });
    if (!category) {
      return NextResponse.json({ error: 'Field Collection category not configured.' }, { status: 500 });
    }

    const currentYear =
      (await prisma.academicYear.findFirst({ where: { isCurrent: true } })) ||
      (await prisma.academicYear.findFirst());

    const defaultSub = category.subcategories[0] || null;
    let savedCount = 0;

    for (const entry of entries) {
      const studentId = entry.studentId;
      const points = typeof entry.points === 'number' ? entry.points : parseFloat(entry.points);
      const remarkText =
        entry.remarks?.trim() ||
        driveName?.trim() ||
        defaultRemarks?.trim() ||
        'Field Collection Drive';

      if (!studentId) continue;
      if (isNaN(points) || points < 0) continue;

      const numericPoints = Number(points.toFixed(2));

      // Check if student already has a record with specific ID, or matching this drive remarks
      if (entry.recordId) {
        await prisma.performanceRecord.update({
          where: { id: entry.recordId },
          data: {
            obtainedScore: numericPoints,
            maxScore: numericPoints > 100 ? numericPoints : 100,
            percentage: numericPoints > 100 ? 100 : numericPoints,
            remarks: remarkText,
            updatedById: user.id,
            updatedAt: new Date(),
          },
        });
      } else {
        // Look for existing record for this student in this category with matching remark
        const existing = await prisma.performanceRecord.findFirst({
          where: {
            studentId,
            categoryId: category.id,
            ...(remarkText ? { remarks: remarkText } : {}),
          },
        });

        if (existing) {
          await prisma.performanceRecord.update({
            where: { id: existing.id },
            data: {
              obtainedScore: numericPoints,
              maxScore: numericPoints > 100 ? numericPoints : 100,
              percentage: numericPoints > 100 ? 100 : numericPoints,
              remarks: remarkText,
              updatedById: user.id,
              updatedAt: new Date(),
            },
          });
        } else {
          await prisma.performanceRecord.create({
            data: {
              studentId,
              categoryId: category.id,
              subcategoryId: defaultSub?.id,
              obtainedScore: numericPoints,
              maxScore: numericPoints > 100 ? numericPoints : 100,
              percentage: numericPoints > 100 ? 100 : numericPoints,
              position: 'Participated',
              academicYearId: currentYear?.id,
              remarks: remarkText,
              date: new Date(),
              createdById: user.id,
            },
          });
        }
      }
      savedCount++;

      // Automatically reconcile and credit student cash wallet for this recording
      try {
        await syncStudentEarnings(studentId);
      } catch (earnErr) {
        console.warn('Earnings sync error for student:', studentId, earnErr);
      }
    }

    // Invalidate caches
    invalidateEngineCache();

    // Log audit
    await logAuditAction({
      userId: user.id,
      action: 'UPDATE_FIELD_COLLECTION_POINTS',
      entity: 'CATEGORY',
      entityId: category.id,
      newValue: { count: savedCount, driveName, defaultRemarks },
    });

    return NextResponse.json({
      success: true,
      count: savedCount,
      message: `Successfully saved points for ${savedCount} student(s).`,
    });
  } catch (error: any) {
    console.error('Error in POST /api/field-collection:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to save field collection entries.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse || !user) {
      return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const recordId = searchParams.get('id');

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required.' }, { status: 400 });
    }

    await prisma.performanceRecord.delete({
      where: { id: recordId },
    });

    invalidateEngineCache();

    await logAuditAction({
      userId: user.id,
      action: 'DELETE_FIELD_COLLECTION_RECORD',
      entity: 'PERFORMANCE_RECORD',
      entityId: recordId,
    });

    return NextResponse.json({
      success: true,
      message: 'Field collection record deleted successfully.',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/field-collection:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete field collection record.' },
      { status: 500 }
    );
  }
}
