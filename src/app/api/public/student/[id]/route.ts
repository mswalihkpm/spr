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

    // Compute live rankings instantly from single cached leaderboard dataset
    const allLeaderboard = await calculateAllLeaderboards({ academicYearId: profile.student.academicYear.id });

    const classEntries = allLeaderboard.filter((e) => e.className === profile.student.class.name);
    const schoolEntries = allLeaderboard.filter((e) => e.schoolName === profile.student.school.name);

    const overallRank = allLeaderboard.findIndex((e) => e.studentId === studentId) + 1 || 1;
    const classRank = classEntries.findIndex((e) => e.studentId === studentId) + 1 || 1;
    const schoolRank = schoolEntries.findIndex((e) => e.studentId === studentId) + 1 || 1;

    profile.rank = overallRank;
    profile.classRank = classRank;
    profile.schoolRank = schoolRank;
    profile.totalStudentsOverall = allLeaderboard.length;
    profile.totalStudentsInClass = classEntries.length;
    profile.totalStudentsInSchool = schoolEntries.length;

    const enrichedProfile: any = {
      ...profile,
      overallScore: profile.overallSPR,
      categoryBreakdown: (profile.categoryScores || []).map((c) => ({
        categoryId: c.categoryId,
        categoryCode: c.categoryCode,
        categoryName: c.categoryName,
        icon: c.icon,
        score: c.percentage,
        percentage: c.percentage,
        weight: c.weight,
        recordsCount: c.recordsCount,
        isIncluded: c.isIncluded,
        records: c.records || [],
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
