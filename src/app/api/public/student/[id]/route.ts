export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateStudentSPR, calculateAllLeaderboards } from '@/lib/spr-engine';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const studentIdentifier = params.id;

    // Find student either by database ID, studentId (e.g. MSOE-2026-001), or sprStudentId (e.g. SPR0001)
    let student = await prisma.student.findUnique({
      where: { id: studentIdentifier },
    });

    if (!student) {
      student = await prisma.student.findFirst({
        where: {
          OR: [
            { studentId: { equals: studentIdentifier, mode: 'insensitive' } },
            { sprStudentId: { equals: studentIdentifier, mode: 'insensitive' } },
          ],
        },
      });
    }

    if (!student) {
      return NextResponse.json({ error: 'Student record not found in SPR database.' }, { status: 404 });
    }

    const studentId = student.id;
    const profile = await calculateStudentSPR(studentId);

    if (!profile) {
      return NextResponse.json({ error: 'Failed to compute student performance dossier.' }, { status: 500 });
    }

    // Compute live rankings
    const [allLeaderboard, classLeaderboard, schoolLeaderboard] = await Promise.all([
      calculateAllLeaderboards({ academicYearId: profile.student.academicYear.id }),
      calculateAllLeaderboards({
        academicYearId: profile.student.academicYear.id,
        classId: profile.student.class.id,
      }),
      calculateAllLeaderboards({
        academicYearId: profile.student.academicYear.id,
        schoolId: profile.student.school.id,
      }),
    ]);

    const overallEntry = allLeaderboard.find((e) => e.studentId === studentId);
    const classEntry = classLeaderboard.find((e) => e.studentId === studentId);
    const schoolEntry = schoolLeaderboard.find((e) => e.studentId === studentId);

    profile.rank = overallEntry?.rank || 1;
    profile.classRank = classEntry?.rank || 1;
    profile.schoolRank = schoolEntry?.rank || 1;
    profile.totalStudentsOverall = allLeaderboard.length;
    profile.totalStudentsInClass = classLeaderboard.length;
    profile.totalStudentsInSchool = schoolLeaderboard.length;

    const enrichedProfile: any = {
      ...profile,
      overallScore: profile.overallSPR,
      categoryBreakdown: (profile.categoryScores || []).map((c) => ({
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        score: c.percentage,
        percentage: c.percentage,
        weight: c.weight,
      })),
    };

    // Fetch student's published creative works & library reading history
    const [creativeWorks, libraryRecords] = await Promise.all([
      prisma.creativeHubSubmission.findMany({
        where: { studentId, publicationStatus: { in: ['PUBLISHED', 'FEATURED'] } },
        include: { category: true },
        orderBy: { date: 'desc' },
      }),
      prisma.libraryRecord.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      profile: enrichedProfile,
      creativeWorks,
      libraryRecords,
    });
  } catch (error: any) {
    console.error('Public student scorecard error:', error);
    return NextResponse.json({ error: 'Failed to fetch student scorecard.' }, { status: 500 });
  }
}
