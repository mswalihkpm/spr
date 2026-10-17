export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category')?.toUpperCase() || ''; // 'LITERARY' | 'PROGRAMS' | ''
    const q = searchParams.get('q')?.trim().toLowerCase() || '';

    // 1. Fetch relevant categories
    const categories = await prisma.category.findMany({
      where: category ? { code: category } : { code: { in: ['LITERARY', 'PROGRAMS'] } },
    });
    const categoryIds = categories.map((c) => c.id);

    // 2. Fetch distinct performance records with competition/literaryCompetition
    const records = await prisma.performanceRecord.findMany({
      where: {
        categoryId: categoryIds.length > 0 ? { in: categoryIds } : undefined,
        OR: [
          { literaryCompetitionId: { not: null } },
          { competitionId: { not: null } },
          { remarks: { not: null } },
        ],
      },
      select: {
        id: true,
        obtainedScore: true,
        maxScore: true,
        position: true,
        levelId: true,
        remarks: true,
        categoryId: true,
        category: { select: { code: true, name: true } },
        level: { select: { id: true, name: true, weightMultiplier: true } },
        literaryCompetition: {
          select: {
            id: true,
            name: true,
            maxScore: true,
            event: { select: { id: true, name: true } },
            level: { select: { id: true, name: true, weightMultiplier: true } },
          },
        },
        competition: {
          select: {
            id: true,
            name: true,
            maxScore: true,
            program: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    // 3. Also fetch defined literary competitions and program competitions from database
    const [definedLitComps, definedComps] = await Promise.all([
      prisma.literaryCompetition.findMany({
        select: {
          id: true,
          name: true,
          maxScore: true,
          levelId: true,
          event: { select: { id: true, name: true } },
          level: { select: { id: true, name: true, weightMultiplier: true } },
        },
        take: 300,
      }),
      prisma.competition.findMany({
        select: {
          id: true,
          name: true,
          maxScore: true,
          program: { select: { id: true, name: true } },
        },
        take: 300,
      }),
    ]);

    // Map to aggregate unique programmes by clean name
    const programmeMap = new Map<
      string,
      {
        name: string;
        basePoint: number;
        maxScore: number;
        eventName?: string;
        levelId?: string;
        levelName?: string;
        categoryCode: string;
        categoryName: string;
        usageCount: number;
      }
    >();

    // Process performance records first (they have the actual base points recorded by admin!)
    for (const r of records) {
      let progName = '';
      let eventName = '';
      let catCode = r.category?.code || 'PROGRAMS';
      let catName = r.category?.name || 'Programs';

      if (r.literaryCompetition?.name) {
        progName = r.literaryCompetition.name.trim();
        eventName = r.literaryCompetition.event?.name || 'Literary Festival';
        catCode = 'LITERARY';
        catName = 'Literary Festivals';
      } else if (r.competition?.name) {
        progName = r.competition.name.trim();
        eventName = r.competition.program?.name || 'Program';
        catCode = 'PROGRAMS';
        catName = 'Programs';
      } else if (r.remarks) {
        // Fallback: Parse from remarks if formatted like "Sahityotsav - HIGHSCHOOL Malayalam Essay Writing. 1st Position."
        const match = r.remarks.match(/^(.*?)\s*-\s*([^.]+)/);
        if (match) {
          eventName = match[1].trim();
          progName = match[2].trim();
        }
      }

      if (!progName) continue;

      const key = progName.toLowerCase();
      const basePoint = typeof r.obtainedScore === 'number' && !isNaN(r.obtainedScore) ? r.obtainedScore : 50;

      if (!programmeMap.has(key)) {
        programmeMap.set(key, {
          name: progName,
          basePoint,
          maxScore: r.maxScore || 100,
          eventName,
          levelId: r.levelId || r.literaryCompetition?.level?.id || undefined,
          levelName: r.level?.name || r.literaryCompetition?.level?.name || undefined,
          categoryCode: catCode,
          categoryName: catName,
          usageCount: 1,
        });
      } else {
        const item = programmeMap.get(key)!;
        item.usageCount += 1;
        // Keep the latest recorded non-zero base point
        if (basePoint > 0) item.basePoint = basePoint;
        if (!item.eventName && eventName) item.eventName = eventName;
        if (!item.levelId && r.levelId) {
          item.levelId = r.levelId;
          item.levelName = r.level?.name;
        }
      }
    }

    // Include defined literary competitions if not already mapped
    if (!category || category === 'LITERARY') {
      for (const d of definedLitComps) {
        const key = d.name.trim().toLowerCase();
        if (!programmeMap.has(key)) {
          programmeMap.set(key, {
            name: d.name.trim(),
            basePoint: d.maxScore > 0 ? (d.maxScore <= 10 ? d.maxScore : 50) : 50,
            maxScore: d.maxScore || 100,
            eventName: d.event?.name || 'Literary Festival',
            levelId: d.levelId || undefined,
            levelName: d.level?.name || undefined,
            categoryCode: 'LITERARY',
            categoryName: 'Literary Festivals',
            usageCount: 0,
          });
        }
      }
    }

    // Include defined program competitions if not already mapped
    if (!category || category === 'PROGRAMS') {
      for (const d of definedComps) {
        const key = d.name.trim().toLowerCase();
        if (!programmeMap.has(key)) {
          programmeMap.set(key, {
            name: d.name.trim(),
            basePoint: d.maxScore > 0 ? (d.maxScore <= 10 ? d.maxScore : 50) : 50,
            maxScore: d.maxScore || 100,
            eventName: d.program?.name || 'Program',
            categoryCode: 'PROGRAMS',
            categoryName: 'Programs',
            usageCount: 0,
          });
        }
      }
    }

    let programmes = Array.from(programmeMap.values());

    // Filter by search query if provided
    if (q) {
      programmes = programmes.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.eventName && p.eventName.toLowerCase().includes(q))
      );
    }

    // Sort by usage count desc, then alphabetically
    programmes.sort((a, b) => b.usageCount - a.usageCount || a.name.localeCompare(b.name));

    return NextResponse.json({
      programmes,
      total: programmes.length,
    });
  } catch (error: any) {
    console.error('Fetch programmes history error:', error);
    return NextResponse.json({ error: 'Failed to fetch programmes history.' }, { status: 500 });
  }
}
