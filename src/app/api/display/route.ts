export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { calculateAllLeaderboards, getCachedSettings, getCachedCategories } from '@/lib/spr-engine';
import { getCachedAcademicClasses } from '@/lib/academic-cache';

const displayCache = new Map<string, { timestamp: number; data: any }>();
const DISPLAY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId') || undefined;
    const classId = searchParams.get('classId') || undefined;
    const isFresh = searchParams.get('fresh') === 'true' || searchParams.has('t') || req.headers.get('cache-control') === 'no-cache';

    const cacheKey = `${categoryId || 'all'}_${classId || 'all'}`;
    const cached = displayCache.get(cacheKey);
    if (!isFresh && cached && Date.now() - cached.timestamp < DISPLAY_CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      });
    }

    const [settings, categories, classes, leaderboard] = await Promise.all([
      getCachedSettings(),
      getCachedCategories(),
      getCachedAcademicClasses(),
      calculateAllLeaderboards({ categoryId, classId }),
    ]);

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
      institutionName: settings.INSTITUTION_NAME || 'Madin School of Excellence',
      autoScrollInterval: parseInt(settings.DISPLAY_AUTOSCROLL_INTERVAL || '10', 10),
      introFooter: settings.APP_INTRO_FOOTER || '2026 version 0.1',
      leaderboard: sanitizedLeaderboard,
      categories: categories.map((c: any) => ({ id: c.id, code: c.code, name: c.name, icon: c.icon })),
      classes: classes.map((c: any) => ({ id: c.id, name: c.name })),
      topThree: sanitizedLeaderboard.slice(0, 3),
    };

    if (!isFresh) {
      if (displayCache.size > 50) {
        displayCache.clear();
      }
      displayCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });
    }

    return NextResponse.json(responsePayload, {
      headers: {
        'Cache-Control': isFresh
          ? 'private, no-cache, no-store, must-revalidate'
          : 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (error: any) {
    console.error('Display API error:', error);
    return NextResponse.json({ error: 'Failed to fetch display data.' }, { status: 500 });
  }
}
