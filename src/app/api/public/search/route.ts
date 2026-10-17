export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const searchCache = new Map<string, { timestamp: number; data: any }>();
const SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';

    if (!q) {
      return NextResponse.json({ students: [], items: [] });
    }

    const cacheKey = q.toLowerCase();
    const now = Date.now();
    const cached = searchCache.get(cacheKey);
    if (cached && now - cached.timestamp < SEARCH_CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      });
    }

    // Split search query into individual words/tokens for flexible multi-term matching
    const rawWords = q.split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) {
      return NextResponse.json({ students: [], items: [] });
    }

    // Expand search words with aliases (e.g. "hs" -> "highschool", "high school")
    const words = rawWords.map((w) => w.toLowerCase());

    // 1. STUDENTS SEARCH
    const andConditions = rawWords.map((w) => {
      const orConditions: any[] = [
        { fullName: { contains: w, mode: 'insensitive' as const } },
        { studentId: { contains: w, mode: 'insensitive' as const } },
        { sprStudentId: { contains: w, mode: 'insensitive' as const } },
        { division: { contains: w, mode: 'insensitive' as const } },
        { class: { name: { contains: w, mode: 'insensitive' as const } } },
        { school: { name: { contains: w, mode: 'insensitive' as const } } },
      ];

      const sprMatch = w.match(/^spr-?(\d+)$/i);
      if (sprMatch) {
        const num = parseInt(sprMatch[1], 10);
        const formatted = `SPR${String(num).padStart(4, '0')}`;
        orConditions.push({ sprStudentId: { equals: formatted, mode: 'insensitive' as const } });
      }

      return { OR: orConditions };
    });

    const studentsPromise = prisma.student.findMany({
      where: {
        status: { not: 'INACTIVE' },
        AND: andConditions,
      },
      select: {
        id: true,
        studentId: true,
        sprStudentId: true,
        fullName: true,
        division: true,
        photoUrl: true,
        class: { select: { id: true, name: true, numericGrade: true } },
        school: { select: { id: true, name: true } },
      },
      take: 20,
      orderBy: [{ class: { numericGrade: 'asc' } }, { fullName: 'asc' }],
    });

    // 2. PROGRAMMES, COMPETITIONS & EXAMS SEARCH (Filtered at database level!)
    const itemOrConditions = rawWords.map((w) => ({
      name: { contains: w, mode: 'insensitive' as const },
    }));

    // Query literary competitions matching keywords
    const litCompsPromise = prisma.literaryCompetition.findMany({
      where: {
        OR: [
          ...itemOrConditions,
          { event: { name: { contains: q, mode: 'insensitive' as const } } },
        ],
      },
      select: {
        id: true,
        name: true,
        maxScore: true,
        event: { select: { name: true } },
        _count: { select: { performanceRecords: true } },
      },
      take: 20,
    });

    // Query program competitions matching keywords
    const compsPromise = prisma.competition.findMany({
      where: {
        OR: [
          ...itemOrConditions,
          { program: { name: { contains: q, mode: 'insensitive' as const } } },
        ],
      },
      select: {
        id: true,
        name: true,
        maxScore: true,
        program: { select: { name: true } },
        _count: { select: { performanceRecords: true } },
      },
      take: 20,
    });

    // Query exams matching keywords
    const examsPromise = prisma.exam.findMany({
      where: {
        OR: [
          ...itemOrConditions,
          { category: { name: { contains: q, mode: 'insensitive' as const } } },
        ],
      },
      select: {
        id: true,
        name: true,
        category: { select: { name: true, code: true } },
        _count: { select: { performanceRecords: true } },
      },
      take: 15,
    });

    const [students, litComps, comps, exams] = await Promise.all([
      studentsPromise,
      litCompsPromise,
      compsPromise,
      examsPromise,
    ]);

    // Normalize matching text helper: replaces "highschool" with "hs", removes punctuation
    const normalizeString = (str: string) => {
      return (str || '')
        .toLowerCase()
        .replace(/highschool|high\s*school/g, 'hs')
        .replace(/junior/g, 'jr')
        .replace(/senior/g, 'sr')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const searchTokens = words.map(normalizeString).filter(Boolean);
    const normalizedQuery = normalizeString(q);

    const matchesQuery = (name: string, parentName: string = '') => {
      const fullNormalized = normalizeString(`${name} ${parentName}`);
      if (fullNormalized.includes(normalizedQuery)) return true;
      // All tokens or significant tokens match
      let matchCount = 0;
      for (const token of searchTokens) {
        if (fullNormalized.includes(token)) matchCount++;
      }
      return matchCount >= Math.min(searchTokens.length, 2) || (searchTokens.length === 1 && matchCount === 1);
    };

    // Unified items map to merge duplicate items with identical names into a single leaderboard entry
    const itemsMap = new Map<
      string,
      {
        id: string;
        ids: string[];
        name: string;
        type: 'LITERARY_COMPETITION' | 'COMPETITION' | 'EXAM';
        parentName: string;
        categoryName: string;
        categoryCode: string;
        participantCount: number;
        maxScore?: number;
      }
    >();

    const registerItem = (item: {
      id: string;
      name: string;
      type: 'LITERARY_COMPETITION' | 'COMPETITION' | 'EXAM';
      parentName: string;
      categoryName: string;
      categoryCode: string;
      participantCount: number;
      maxScore?: number;
    }) => {
      const cleanName = item.name.trim();
      const groupKey = `${item.type}_${cleanName.toLowerCase()}`;
      const existing = itemsMap.get(groupKey);
      if (existing) {
        existing.participantCount += item.participantCount;
        if (!existing.ids.includes(item.id)) {
          existing.ids.push(item.id);
        }
        if (!existing.parentName && item.parentName) {
          existing.parentName = item.parentName;
        }
      } else {
        itemsMap.set(groupKey, {
          ...item,
          name: cleanName,
          ids: [item.id],
        });
      }
    };

    // Filter literary competitions
    litComps.forEach((lc) => {
      const parent = lc.event?.name || 'Literary Festival';
      if (matchesQuery(lc.name, parent)) {
        registerItem({
          id: lc.id,
          name: lc.name,
          type: 'LITERARY_COMPETITION',
          parentName: parent,
          categoryName: 'Literary Festivals',
          categoryCode: 'LITERARY',
          participantCount: lc._count?.performanceRecords || 0,
          maxScore: lc.maxScore,
        });
      }
    });

    // Filter program competitions
    comps.forEach((c) => {
      const parent = c.program?.name || 'Programs';
      if (matchesQuery(c.name, parent)) {
        registerItem({
          id: c.id,
          name: c.name,
          type: 'COMPETITION',
          parentName: parent,
          categoryName: 'Programs & Competitions',
          categoryCode: 'PROGRAMS',
          participantCount: c._count?.performanceRecords || 0,
          maxScore: c.maxScore,
        });
      }
    });

    // Filter exams
    exams.forEach((e) => {
      const parent = e.category?.name || 'Academic Assessment';
      if (matchesQuery(e.name, parent)) {
        registerItem({
          id: e.id,
          name: e.name,
          type: 'EXAM',
          parentName: parent,
          categoryName: e.category?.name || 'School Studies',
          categoryCode: e.category?.code || 'SCHOOL',
          participantCount: e._count?.performanceRecords || 0,
        });
      }
    });

    const items = Array.from(itemsMap.values());

    // Sort items: items with more participants and closer name match first
    items.sort((a, b) => {
      const aExact = normalizeString(a.name) === normalizedQuery ? 1 : 0;
      const bExact = normalizeString(b.name) === normalizedQuery ? 1 : 0;
      if (bExact !== aExact) return bExact - aExact;
      if (b.participantCount !== a.participantCount) return b.participantCount - a.participantCount;
      return a.name.localeCompare(b.name);
    });

    const payload = {
      students: students.map((s) => ({
        id: s.id,
        studentId: s.studentId,
        sprStudentId: s.sprStudentId,
        fullName: s.fullName,
        className: s.class?.name || '',
        schoolName: s.school?.name || '',
        division: s.division,
        photoUrl: s.photoUrl,
      })),
      items: items.slice(0, 15),
    };

    searchCache.set(cacheKey, { timestamp: now, data: payload });

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('Public search error:', error);
    return NextResponse.json({ error: 'Failed to search students and items.' }, { status: 500 });
  }
}
