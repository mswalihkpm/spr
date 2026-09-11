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

    const overallEntry = allLeaderboard.find((e) => e.studentId === studentId);
    const overallRank = overallEntry?.rank || 1;

    const computeTiedRank = (list: any[], id: string) => {
      const sorted = [...list].sort((a, b) => (b.spr || 0) - (a.spr || 0));
      let currentRank = 1;
      for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && (sorted[i].spr || 0) < (sorted[i - 1].spr || 0)) {
          currentRank = i + 1;
        }
        if (sorted[i].studentId === id) {
          return currentRank;
        }
      }
      return 1;
    };

    const classRank = computeTiedRank(classEntries, studentId);
    const schoolRank = computeTiedRank(schoolEntries, studentId);

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
        priority: c.priority,
        score: c.percentage,
        percentage: c.percentage,
        normalizedPercentage: c.normalizedPercentage,
        rawInput: c.rawInput,
        earnedPoints: c.earnedPoints,
        normalizationRef: c.normalizationRef,
        weightedContribution: c.weightedContribution,
        formula: c.formula,
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

    return NextResponse.json(
      {
        profile: enrichedProfile,
        creativeWorks,
        libraryRecords,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=45',
        },
      }
    );
  } catch (error: any) {
    console.error('Public student scorecard error:', error);
    return NextResponse.json({ error: 'Failed to fetch student scorecard.' }, { status: 500 });
  }
}
