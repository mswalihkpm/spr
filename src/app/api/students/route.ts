export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { generateNextSprId, checkSprIdAvailable, normalizeSprId } from '@/lib/spr-id';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'VIEWER');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const classId = searchParams.get('classId') || '';
    const schoolId = searchParams.get('schoolId') || '';
    const academicYearId = searchParams.get('academicYearId') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search.trim()) {
      const words = search.trim().split(/\s+/).filter(Boolean);
      where.AND = words.map((w) => ({
        OR: [
          { fullName: { contains: w, mode: 'insensitive' as const } },
          { studentId: { contains: w, mode: 'insensitive' as const } },
          { sprStudentId: { contains: w, mode: 'insensitive' as const } },
          { division: { contains: w, mode: 'insensitive' as const } },
          { class: { name: { contains: w, mode: 'insensitive' as const } } },
          { school: { name: { contains: w, mode: 'insensitive' as const } } },
        ],
      }));
    }
    if (classId) where.classId = classId;
    if (schoolId) where.schoolId = schoolId;
    if (academicYearId) where.academicYearId = academicYearId;
    if (status) where.status = status;

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        include: {
          class: true,
          school: true,
          academicYear: true,
        },
        orderBy: [{ class: { numericGrade: 'asc' } }, { fullName: 'asc' }],
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      students,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Students fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch students.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { studentId, sprStudentId, fullName, classId, schoolId, division, academicYearId, notes, photoUrl } = body;

    if (!fullName || !classId || !schoolId) {
      return NextResponse.json({ error: 'Full Name, Class, and School are required.' }, { status: 400 });
    }

    // Resolve or generate studentId
    const resolvedStudentId = (studentId || `MSOE-${Date.now().toString(36).toUpperCase()}`).trim();

    // Check duplicate studentId
    const existing = await prisma.student.findUnique({
      where: { studentId: resolvedStudentId },
    });
    if (existing) {
      return NextResponse.json({ error: `Student with ID "${resolvedStudentId}" already exists.` }, { status: 400 });
    }

    // Resolve or generate sprStudentId
    let finalSprId: string;
    if (sprStudentId && sprStudentId.trim()) {
      const checkResult = await checkSprIdAvailable(sprStudentId.trim());
      if (!checkResult.available) {
        return NextResponse.json({ error: checkResult.error || 'SPR Student ID already exists. Please use a unique ID.' }, { status: 400 });
      }
      finalSprId = normalizeSprId(sprStudentId.trim());
    } else {
      finalSprId = await generateNextSprId();
    }

    // Get current academic year if not provided
    let yearId = academicYearId;
    if (!yearId) {
      const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true },
      });
      yearId = currentYear?.id;
    }

    const student = await prisma.student.create({
      data: {
        studentId: resolvedStudentId,
        sprStudentId: finalSprId,
        fullName: fullName.trim(),
        classId,
        schoolId,
        division: division ? division.trim() : 'A',
        academicYearId: yearId,
        status: 'ACTIVE',
        notes: notes || null,
        photoUrl: photoUrl || null,
      },
      include: {
        class: true,
        school: true,
        academicYear: true,
      },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'CREATE',
      entity: 'Student',
      entityId: student.id,
      newValue: student,
    });

    return NextResponse.json({
      success: true,
      student,
      message: `Student created successfully with SPR ID: ${finalSprId}`,
    });
  } catch (error: any) {
    console.error('Create student error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create student.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { studentIds } = body as { studentIds: string[] };

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'At least one student ID is required for deletion.' }, { status: 400 });
    }

    const [, , , deleteResult] = await prisma.$transaction([
      prisma.performanceRecord.deleteMany({
        where: { studentId: { in: studentIds } },
      }),
      prisma.creativeHubSubmission.deleteMany({
        where: { studentId: { in: studentIds } },
      }),
      prisma.libraryRecord.deleteMany({
        where: { studentId: { in: studentIds } },
      }),
      prisma.student.deleteMany({
        where: { id: { in: studentIds } },
      }),
    ]);

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'BULK_DELETE',
      entity: 'Student',
      newValue: { count: deleteResult.count, studentIds },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.count} student(s) and their associated records.`,
      count: deleteResult.count,
    });
  } catch (error: any) {
    console.error('Bulk delete students error:', error);
    return NextResponse.json({ error: error.message || 'Failed to bulk delete students.' }, { status: 500 });
  }
}

