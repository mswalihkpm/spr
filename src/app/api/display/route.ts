export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateAllLeaderboards, getCachedSettings, getCachedCategories } from '@/lib/spr-engine';
import { getCachedAcademicClasses } from '@/lib/academic-cache';

const displayCache = new Map<string, { timestamp: number; data: any }>();
const DISPLAY_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId') || undefined;
    const classId = searchParams.get('classId') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 500) : 280; // default to up to 280 (20 slides of 14)
    const isFresh = searchParams.get('fresh') === 'true' || searchParams.has('t') || req.headers.get('cache-control') === 'no-cache';

    const cacheKey = `${categoryId || 'all'}_${classId || 'all'}_${limit}`;
    const cached = displayCache.get(cacheKey);
    if (!isFresh && cached && Date.now() - cached.timestamp < DISPLAY_CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      });
    }

    const [settings, categories, classes, leaderboard, notificationsData, newsData] = await Promise.all([
      getCachedSettings(),
      getCachedCategories(),
      getCachedAcademicClasses(),
      calculateAllLeaderboards({ categoryId, classId }),
      prisma.homepageNotification.findMany({
        where: { active: true },
        select: { id: true, title: true, text: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }).catch(() => []),
      prisma.news.findMany({
        where: { active: true },
        select: { id: true, title: true, subtitle: true, body: true, publishedAt: true },
        orderBy: { publishedAt: 'desc' },
        take: 6,
      }).catch(() => []),
    ]);

    // Prepare notifications slideshow stream
    let broadcastNotifications: { id: string; title: string; text: string }[] = [];
    if (notificationsData.length > 0) {
      broadcastNotifications = notificationsData.map((n) => ({
        id: n.id,
        title: n.title || 'Announcement',
        text: n.text,
      }));
    } else if (newsData.length > 0) {
      broadcastNotifications = newsData.map((n) => ({
        id: n.id,
        title: n.title,
        text: n.subtitle || (n.body ? n.body.slice(0, 140) + '...' : ''),
      }));
    }

    if (broadcastNotifications.length === 0) {
      broadcastNotifications = [
        {
          id: 'def-1',
          title: 'Madin School of Excellence',
          text: 'Official SPR Continuous Evaluation Platform — Live TV Broadcast Standings.',
        },
        {
          id: 'def-2',
          title: 'Academic Year 2025–2026',
          text: 'Real-time performance index computed across academic and literary wings.',
        },
        {
          id: 'def-3',
          title: 'Excellence in Action',
          text: 'Recognizing student leadership, reading, attendance, and moral benchmarks.',
        },
      ];
    }

    // Sanitize leaderboard entries for broadcast
    const sanitizedLeaderboard = leaderboard.slice(0, limit).map((entry) => ({
      rank: entry.rank,
      name: entry.name,
      studentName: entry.name,
      studentCode: entry.studentCode || entry.sprStudentId || '',
      sprStudentId: entry.sprStudentId || entry.studentCode || '',
      className: entry.className || '',
      schoolName: entry.schoolName || '',
      division: entry.division || '',
      photoUrl: entry.photoUrl || null,
      spr: entry.spr,
    }));

    const responsePayload = {
      institutionName: settings.INSTITUTION_NAME || 'Madin School of Excellence',
      autoScrollInterval: parseInt(settings.DISPLAY_AUTOSCROLL_INTERVAL || '7', 10),
      introFooter: settings.APP_INTRO_FOOTER || 'Madin School of Excellence • SPR Platform',
      leaderboard: sanitizedLeaderboard,
      totalCount: sanitizedLeaderboard.length,
      categories: categories.map((c: any) => ({ id: c.id, code: c.code, name: c.name, icon: c.icon })),
      classes: classes.map((c: any) => ({ id: c.id, name: c.name })),
      topThree: sanitizedLeaderboard.slice(0, 3),
      notifications: broadcastNotifications,
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
          : 'public, s-maxage=120, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('Display API error:', error);
    return NextResponse.json({ error: 'Failed to fetch display data.' }, { status: 500 });
  }
}
