export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateAllLeaderboards, getCachedCategories, onInvalidateEngine } from '@/lib/spr-engine';
import { fetchOrGetAcademicMasterData } from '@/lib/academic-cache';
import { sanitizeSubcategoryLogo } from '@/lib/logo-utils';

let cachedBootstrap: { timestamp: number; payload: any } | null = null;
const BOOTSTRAP_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in-memory warm cache

onInvalidateEngine(() => {
  cachedBootstrap = null;
});

/**
 * Unified public cold-start bootstrap endpoint.
 * Replaces 4 separate cold-start function invocations (/api/academic, /api/leaderboard,
 * /api/news, /api/subcategories) with a single edge-cached + memory-cached payload.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true' || searchParams.has('t');

    if (!force && cachedBootstrap && Date.now() - cachedBootstrap.timestamp < BOOTSTRAP_CACHE_TTL_MS) {
      return NextResponse.json(cachedBootstrap.payload, {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=900',
          'X-SPR-Bootstrap': 'HIT',
        },
      });
    }

    const [academic, categories, leaderboard, news, rawSubcategories] = await Promise.all([
      fetchOrGetAcademicMasterData(force),
      getCachedCategories(),
      calculateAllLeaderboards({}),
      prisma.news.findMany({
        where: { active: true },
        orderBy: { publishedAt: 'desc' },
        take: 30,
      }),
      prisma.subcategory.findMany({
        select: {
          id: true,
          categoryId: true,
          name: true,
          code: true,
          logoUrl: true,
          hasLevels: true,
          levelGroup: true,
          allowedLevelIds: true,
          hasMaxScore: true,
          maxScore: true,
          weight: true,
          displayOrder: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    const subcategories = rawSubcategories.map((sub: any) => ({
      ...sub,
      logoUrl: sanitizeSubcategoryLogo(sub.code, sub.logoUrl),
    }));

    const payload = {
      academic,
      categories,
      leaderboard,
      news,
      subcategories,
    };

    if (!force) {
      cachedBootstrap = { timestamp: Date.now(), payload };
    }

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': force
          ? 'private, no-cache, no-store, must-revalidate'
          : 'public, max-age=60, s-maxage=300, stale-while-revalidate=900',
        'X-SPR-Bootstrap': 'MISS',
      },
    });
  } catch (error: any) {
    console.error('Bootstrap API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load SPR bootstrap data.' },
      { status: 500 }
    );
  }
}
