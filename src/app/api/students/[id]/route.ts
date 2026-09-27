export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { calculateStudentSPR, calculateFastStudentRanks, invalidateEngineCache } from '@/lib/spr-engine';
import { checkSprIdAvailable, normalizeSprId } from '@/lib/spr-id';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'VIEWER');
    if (errorResponse) return errorResponse;

    const studentId = params.id;

    // Parallel fetch: SPR computation + creative hub + library records
    const [profile, creativeWorks, libraryRecords] = await Promise.all([
      calculateStudentSPR(studentId),
      prisma.creativeHubSubmission.findMany({
        where: { studentId },
        include: { category: true },
        orderBy: { date: 'desc' },
      }),
      prisma.libraryRecord.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!profile) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    // Compute live rankings with lightweight instant calculation
    const ranks = await calculateFastStudentRanks(
      profile.student.id,
      profile.student.academicYear?.id,
      profile.student.class?.id,
      profile.student.school?.id
    );

    profile.rank = ranks.overallRank;
    profile.overallRank = ranks.overallRank;
    profile.classRank = ranks.classRank;
    profile.schoolRank = ranks.schoolRank;
    profile.totalStudentsOverall = ranks.totalStudentsOverall;
    profile.totalStudentsInClass = ranks.totalStudentsInClass;
    profile.totalStudentsInSchool = ranks.totalStudentsInSchool;

    return NextResponse.json({
      profile,
      creativeWorks,
      libraryRecords,
    });
  } catch (error: any) {
    console.error('Student profile fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch student profile.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const studentId = params.id;
    const body = await req.json();
    const { fullName, classId, schoolId, division, status, notes, photoUrl, sprStudentId } = body;

    const previousStudent = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!previousStudent) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    let validatedSprId: string | undefined = undefined;
    if (sprStudentId !== undefined && sprStudentId !== null && sprStudentId.trim() !== '') {
      const normalized = normalizeSprId(sprStudentId);
      if (normalized !== previousStudent.sprStudentId) {
        const checkResult = await checkSprIdAvailable(normalized, studentId);
        if (!checkResult.available) {
          return NextResponse.json({ error: checkResult.error || 'SPR Student ID already exists. Please use a unique ID.' }, { status: 400 });
        }
        validatedSprId = normalized;
      }
    }

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        ...(fullName ? { fullName: fullName.trim() } : {}),
        ...(classId ? { classId } : {}),
        ...(schoolId ? { schoolId } : {}),
        ...(division ? { division: division.trim() } : {}),
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(photoUrl !== undefined ? { photoUrl: photoUrl ? photoUrl : null } : {}),
        ...(validatedSprId !== undefined ? { sprStudentId: validatedSprId } : {}),
      },
      include: {
        class: true,
        school: true,
      },
    });

    logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'UPDATE',
      entity: 'Student',
      entityId: studentId,
      previousValue: previousStudent,
      newValue: updated,
    });

    invalidateEngineCache();

    return NextResponse.json({
      success: true,
      student: updated,
      message: 'Student updated successfully.',
    });
  } catch (error: any) {
    console.error('Update student error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update student.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const studentId = params.id;
    const previousStudent = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!previousStudent) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.performanceRecord.deleteMany({ where: { studentId } }),
      prisma.creativeHubSubmission.deleteMany({ where: { studentId } }),
      prisma.libraryRecord.deleteMany({ where: { studentId } }),
      prisma.studentReport.deleteMany({ where: { studentId } }),
      prisma.student.delete({ where: { id: studentId } }),
    ]);

    logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'DELETE',
      entity: 'Student',
      entityId: studentId,
      previousValue: previousStudent,
    });

    invalidateEngineCache();

    return NextResponse.json({
      success: true,
      message: 'Student deleted successfully.',
    });
  } catch (error: any) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: 'Failed to delete student.' }, { status: 500 });
  }
}
