export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateStudentSPR, calculateFastStudentRanks, onInvalidateEngine } from '@/lib/spr-engine';

// Server-side in-memory cache for public student performance dossiers (2-minute TTL)
// Keyed strictly by canonical student database primary key (id) to prevent cross-student contamination.
interface CachedDossier {
  timestamp: number;
  data: any;
}

const studentDossierServerCache = new Map<string, CachedDossier>();
const DOSSIER_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

// Actively cleared when scoring engine cache is invalidated on mutations
onInvalidateEngine(() => {
  studentDossierServerCache.clear();
});

function clearStudentDossierServerCache() {
  studentDossierServerCache.clear();
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const studentIdentifier = params.id;
    const { searchParams } = new URL(req.url);
    const isFresh =
      searchParams.get('fresh') === 'true' ||
      searchParams.has('t') ||
      req.headers.get('cache-control') === 'no-cache';

    // Find student either by database ID, studentId (e.g. MSOE-2026-001), or sprStudentId (e.g. SPR0001)
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: studentIdentifier },
          { studentId: { equals: studentIdentifier, mode: 'insensitive' } },
          { sprStudentId: { equals: studentIdentifier, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student record not found in SPR database.' },
        {
          status: 404,
          headers: {
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          },
        }
      );
    }

    const studentId = student.id;

    // Check server memory cache if fresh calculation is not explicitly requested
    if (!isFresh) {
      const cached = studentDossierServerCache.get(studentId);
      if (cached && Date.now() - cached.timestamp < DOSSIER_CACHE_TTL_MS) {
        return NextResponse.json(cached.data, {
          headers: {
            'Cache-Control': 'private, max-age=60, must-revalidate',
            'X-SPR-Cache': 'HIT',
          },
        });
      }
    }

    // Parallel fetch: SPR computation + published creative works + library reading history
    const [profile, creativeWorks, libraryRecords] = await Promise.all([
      calculateStudentSPR(studentId),
      prisma.creativeHubSubmission.findMany({
        where: { studentId, publicationStatus: { in: ['PUBLISHED', 'FEATURED'] } },
        select: {
          id: true,
          title: true,
          content: true,
          date: true,
          score: true,
          publicationStatus: true,
          publicationLink: true,
          attachmentUrl: true,
          remarks: true,
          category: { select: { id: true, name: true, code: true, weight: true } },
          publishedMedia: { select: { id: true, name: true } },
          publishedMediaName: true,
          createdAt: true,
        },
        orderBy: { date: 'desc' },
      }),
      prisma.libraryRecord.findMany({
        where: { studentId },
        select: {
          id: true,
          booksRead: true,
          readingScore: true,
          readingRank: true,
          readingPeriod: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!profile) {
      return NextResponse.json({ error: 'Failed to compute student performance dossier.' }, { status: 500 });
    }

    // Compute live rankings with lightweight instant rank calculation
    const ranks = await calculateFastStudentRanks(
      studentId,
      profile.student.academicYear?.id,
      profile.student.class?.id,
      profile.student.school?.id
    );

    const overallRank = ranks.overallRank;
    const classRank = ranks.classRank;
    const schoolRank = ranks.schoolRank;

    profile.rank = overallRank;
    profile.overallRank = overallRank;
    profile.classRank = classRank;
    profile.schoolRank = schoolRank;
    profile.totalStudentsOverall = ranks.totalStudentsOverall;
    profile.totalStudentsInClass = ranks.totalStudentsInClass;
    profile.totalStudentsInSchool = ranks.totalStudentsInSchool;

    // Sanitize student demographics to guarantee zero administrative/private notes exposure
    const rawStudent = profile.student || {};
    const sanitizedStudent = {
      id: rawStudent.id,
      studentId: rawStudent.studentId,
      sprStudentId: rawStudent.sprStudentId,
      fullName: rawStudent.fullName,
      division: rawStudent.division,
      status: rawStudent.status,
      photoUrl: rawStudent.photoUrl,
      class: rawStudent.class,
      school: rawStudent.school,
      academicYear: rawStudent.academicYear,
    };

    const enrichedProfile: any = {
      ...profile,
      student: sanitizedStudent,
      rank: overallRank,
      overallRank: overallRank,
      classRank: classRank,
      schoolRank: schoolRank,
      totalStudentsOverall: ranks.totalStudentsOverall,
      totalStudentsInClass: ranks.totalStudentsInClass,
      totalStudentsInSchool: ranks.totalStudentsInSchool,
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

    const responsePayload = {
      profile: enrichedProfile,
      creativeWorks,
      libraryRecords,
    };

    if (!isFresh) {
      studentDossierServerCache.set(studentId, {
        timestamp: Date.now(),
        data: responsePayload,
      });
    }

    return NextResponse.json(responsePayload, {
      headers: {
        'Cache-Control': isFresh
          ? 'private, no-cache, no-store, must-revalidate'
          : 'private, max-age=60, must-revalidate',
        'X-SPR-Cache': isFresh ? 'BYPASS' : 'MISS',
      },
    });
  } catch (error: any) {
    console.error('Public student scorecard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student scorecard.' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}
