export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateAllLeaderboards, getCachedCategories } from '@/lib/spr-engine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId') || undefined;
    const schoolId = searchParams.get('schoolId') || undefined;
    let categoryId = searchParams.get('categoryId') || searchParams.get('cat') || undefined;
    const subcategoryId = searchParams.get('subcategoryId') || searchParams.get('sub') || undefined;
    const stream = searchParams.get('stream') || undefined;
    const fest = searchParams.get('fest') || undefined;
    const academicYearId = searchParams.get('academicYearId') || undefined;

    // If categoryId is passed as category code (e.g. 'QUALIFICATION', 'ISLAMIC', etc.), resolve to ID
    if (categoryId && !categoryId.startsWith('cm')) {
      const matchedCat = await prisma.category.findUnique({
        where: { code: categoryId.toUpperCase() },
      });
      if (matchedCat) {
        categoryId = matchedCat.id;
      }
    }

    const [entries, categories] = await Promise.all([
      calculateAllLeaderboards({
        classId,
        schoolId,
        categoryId,
        subcategoryId,
        stream,
        fest,
        academicYearId,
      }),
      getCachedCategories(),
    ]);

    return NextResponse.json(
      {
        leaderboard: entries,
        categories,
        totalStudents: entries.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
        },
      }
    );
  } catch (error: any) {
    console.error('Leaderboard calculation error:', error);
    return NextResponse.json({ error: 'Failed to calculate leaderboard.' }, { status: 500 });
  }
}
