export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateAllLeaderboards, calculateClassRankingLeaderboard, getCachedCategories } from '@/lib/spr-engine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const viewType = searchParams.get('type') || searchParams.get('view') || '';
    const classId = searchParams.get('classId') || undefined;
    const schoolId = searchParams.get('schoolId') || undefined;
    let categoryId = searchParams.get('categoryId') || searchParams.get('cat') || undefined;
    const subcategoryId = searchParams.get('subcategoryId') || searchParams.get('sub') || undefined;
    const stream = searchParams.get('stream') || undefined;
    const fest = searchParams.get('fest') || undefined;
    const academicYearId = searchParams.get('academicYearId') || undefined;

    const categories = await getCachedCategories();
    const isFresh = searchParams.get('fresh') === 'true' || searchParams.has('t') || req.headers.get('cache-control') === 'no-cache';

    // 1. Handle Class Ranking Leaderboard Request
    const isClassRanking =
      viewType.toLowerCase() === 'class' ||
      viewType.toLowerCase() === 'classes' ||
      categoryId === 'CLASS_RANKING' ||
      categoryId === 'CLASSES';

    if (isClassRanking) {
      const classRankings = await calculateClassRankingLeaderboard({ academicYearId });
      return NextResponse.json(
        {
          type: 'CLASS_RANKING',
          leaderboard: classRankings,
          categories,
          totalClasses: classRankings.length,
          totalStudents: classRankings.reduce((sum, c) => sum + c.totalStudents, 0),
        },
        {
          headers: {
            'Cache-Control': isFresh
              ? 'private, no-cache, no-store, must-revalidate'
              : 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      );
    }

    // If categoryId is passed as category code (e.g. 'QUALIFICATION', 'ISLAMIC', etc.), resolve to ID from in-memory cache
    if (categoryId && !categoryId.startsWith('cm')) {
      const targetCode = categoryId.toUpperCase();
      const matchedCat = categories.find((c: any) => c.code === targetCode);
      if (matchedCat) {
        categoryId = matchedCat.id;
      }
    }

    const entries = await calculateAllLeaderboards({
      classId,
      schoolId,
      categoryId,
      subcategoryId,
      stream,
      fest,
      academicYearId,
    });

    return NextResponse.json(
      {
        leaderboard: entries,
        categories,
        totalStudents: entries.length,
      },
      {
        headers: {
          'Cache-Control': isFresh
            ? 'private, no-cache, no-store, must-revalidate'
            : 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error: any) {
    console.error('Leaderboard calculation error:', error);
    return NextResponse.json({ error: 'Failed to calculate leaderboard.' }, { status: 500 });
  }
}
