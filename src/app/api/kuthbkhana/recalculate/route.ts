export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { invalidateEngineCache } from '@/lib/spr-engine';

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'KUTHBKHANA_ADMIN');
    if (errorResponse || !user) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    let baseMarkPer10Pages = body.baseMarkPer10Pages !== undefined ? parseFloat(body.baseMarkPer10Pages) : undefined;

    if (baseMarkPer10Pages === undefined || isNaN(baseMarkPer10Pages)) {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'KUTHBKHANA_BASE_MARK_PER_10_PAGES' },
      });
      baseMarkPer10Pages = setting ? parseFloat(setting.value) : 1.0;
    }

    if (isNaN(baseMarkPer10Pages) || baseMarkPer10Pages <= 0) {
      baseMarkPer10Pages = 1.0;
    }

    // Update setting as authoritative
    await prisma.systemSetting.upsert({
      where: { key: 'KUTHBKHANA_BASE_MARK_PER_10_PAGES' },
      create: {
        key: 'KUTHBKHANA_BASE_MARK_PER_10_PAGES',
        value: baseMarkPer10Pages.toString(),
        description: 'Base SPR point awarded per 10 pages read in Kuthbkhana reading program.',
      },
      update: {
        value: baseMarkPer10Pages.toString(),
      },
    });

    // Find Kuthbkhana subcategory and category
    const kuthbkhanaSub = await prisma.subcategory.findFirst({
      where: {
        OR: [
          { code: 'KUTHBKHANA' },
          { name: { contains: 'Kuthbkhana', mode: 'insensitive' } },
        ],
      },
    });

    const libraryCat = await prisma.category.findFirst({
      where: {
        OR: [
          { code: 'LIBRARY' },
          { code: 'KUTHBKHANA' },
          { name: { contains: 'Library', mode: 'insensitive' } },
        ],
      },
    });

    const whereClause: any = {
      OR: [
        ...(kuthbkhanaSub ? [{ subcategoryId: kuthbkhanaSub.id }] : []),
        ...(libraryCat ? [{ categoryId: libraryCat.id }] : []),
        { remarks: { contains: '[Muthala]', mode: 'insensitive' } },
        { remarks: { contains: '[Point picking]', mode: 'insensitive' } },
      ],
    };

    const records = await prisma.performanceRecord.findMany({
      where: whereClause,
      select: {
        id: true,
        remarks: true,
        obtainedScore: true,
      },
    });

    let updatedCount = 0;

    for (const record of records) {
      const remarks = record.remarks || '';
      const pageMatch = remarks.match(/\((?:Pages?|Page\s*No|pp?\.?)\s*:?\s*(\d+)\)/i);

      if (pageMatch) {
        const pagesRead = parseInt(pageMatch[1], 10);
        if (!isNaN(pagesRead) && pagesRead > 0) {
          // Exact formula: (pages / 10) * baseMarkPer10Pages
          const newScore = Math.round(((pagesRead / 10) * baseMarkPer10Pages) * 100) / 100;

          await prisma.performanceRecord.update({
            where: { id: record.id },
            data: {
              obtainedScore: newScore,
              percentage: newScore,
              updatedById: user.id,
            },
          });
          updatedCount++;
        }
      }
    }

    invalidateEngineCache();

    logAuditAction({
      userId: user.id,
      userName: user.name,
      action: 'RECALCULATE_POINTS',
      entity: 'KuthbkhanaRecords',
      newValue: {
        baseMarkPer10Pages,
        totalRecordsChecked: records.length,
        updatedCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully recalculated points for ${updatedCount} Kuthbkhana record(s) based on ${baseMarkPer10Pages} pts per 10 pages!`,
      totalChecked: records.length,
      updatedCount,
      baseMarkPer10Pages,
    });
  } catch (error: any) {
    console.error('Kuthbkhana recalculate error:', error);
    return NextResponse.json({ error: error.message || 'Failed to recalculate Kuthbkhana points.' }, { status: 500 });
  }
}
