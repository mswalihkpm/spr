export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { calculateStudentSPR, calculateAllLeaderboards } from '@/lib/spr-engine';
import { checkSprIdAvailable, normalizeSprId } from '@/lib/spr-id';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'VIEWER');
    if (errorResponse) return errorResponse;

    const studentId = params.id;
    const profile = await calculateStudentSPR(studentId);

    if (!profile) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    // Calculate real rank within Class, School, and Overall
    const allLeaderboard = await calculateAllLeaderboards({
      academicYearId: profile.student.academicYear.id,
    });
    const classLeaderboard = await calculateAllLeaderboards({
      academicYearId: profile.student.academicYear.id,
      classId: profile.student.class.id,
    });
    const schoolLeaderboard = await calculateAllLeaderboards({
      academicYearId: profile.student.academicYear.id,
      schoolId: profile.student.school.id,
    });

    const overallEntry = allLeaderboard.find((e) => e.studentId === studentId);
    const classEntry = classLeaderboard.find((e) => e.studentId === studentId);
    const schoolEntry = schoolLeaderboard.find((e) => e.studentId === studentId);

    profile.rank = overallEntry?.rank || 1;
    profile.classRank = classEntry?.rank || 1;
    profile.schoolRank = schoolEntry?.rank || 1;
    profile.totalStudentsOverall = allLeaderboard.length;
    profile.totalStudentsInClass = classLeaderboard.length;
    profile.totalStudentsInSchool = schoolLeaderboard.length;

    // Fetch student's Creative Hub submissions & Library logs for detailed tab view
    const [creativeWorks, libraryRecords] = await Promise.all([
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

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'UPDATE',
      entity: 'Student',
      entityId: studentId,
      previousValue: previousStudent,
      newValue: updated,
    });

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

    await prisma.student.delete({
      where: { id: studentId },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'DELETE',
      entity: 'Student',
      entityId: studentId,
      previousValue: previousStudent,
    });

    return NextResponse.json({
      success: true,
      message: 'Student deleted successfully.',
    });
  } catch (error: any) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: 'Failed to delete student.' }, { status: 500 });
  }
}
