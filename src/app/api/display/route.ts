export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateAllLeaderboards } from '@/lib/spr-engine';

const displayCache = new Map<string, { timestamp: number; data: any }>();
const DISPLAY_CACHE_TTL = 30 * 1000;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId') || undefined;
    const classId = searchParams.get('classId') || undefined;

    const cacheKey = `${categoryId || 'all'}_${classId || 'all'}`;
    const cached = displayCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < DISPLAY_CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      });
    }

    const [institutionSetting, autoScrollSetting, introFooterSetting, categories, classes] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: 'INSTITUTION_NAME' } }),
      prisma.systemSetting.findUnique({ where: { key: 'DISPLAY_AUTOSCROLL_INTERVAL' } }),
      prisma.systemSetting.findUnique({ where: { key: 'APP_INTRO_FOOTER' } }),
      prisma.category.findMany({ where: { active: true }, select: { id: true, code: true, name: true, icon: true }, orderBy: { displayOrder: 'asc' } }),
      prisma.academicClass.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { numericGrade: 'asc' } }),
    ]);

    const leaderboard = await calculateAllLeaderboards({
      categoryId,
      classId,
    });

    // Strip any sensitive private data: only send rank, name, class, school, spr
    const sanitizedLeaderboard = leaderboard.slice(0, 30).map((entry) => ({
      rank: entry.rank,
      name: entry.name,
      studentCode: entry.studentCode,
      className: entry.className,
      schoolName: entry.schoolName,
      spr: entry.spr,
    }));

    const responsePayload = {
      institutionName: institutionSetting?.value || 'Madin School of Excellence',
      autoScrollInterval: parseInt(autoScrollSetting?.value || '10', 10),
      introFooter: introFooterSetting?.value || '2026 version 0.1',
      leaderboard: sanitizedLeaderboard,
      categories: categories.map((c) => ({ id: c.id, code: c.code, name: c.name, icon: c.icon })),
      classes: classes.map((c) => ({ id: c.id, name: c.name })),
      topThree: sanitizedLeaderboard.slice(0, 3),
    };

    displayCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });

    return NextResponse.json(responsePayload, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    console.error('Display API error:', error);
    return NextResponse.json({ error: 'Failed to fetch display data.' }, { status: 500 });
  }
}
