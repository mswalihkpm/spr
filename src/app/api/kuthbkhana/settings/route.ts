export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'KUTHBKHANA_BASE_MARK_PER_10_PAGES' },
    });

    const baseMarkPer10Pages = setting ? parseFloat(setting.value) : 1.0;

    return NextResponse.json({
      baseMarkPer10Pages: isNaN(baseMarkPer10Pages) ? 1.0 : baseMarkPer10Pages,
    });
  } catch (error: any) {
    console.error('Kuthbkhana settings GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch Kuthbkhana settings.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'KUTHBKHANA_ADMIN');
    if (errorResponse || !user) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { baseMarkPer10Pages } = body;

    const numericVal = parseFloat(baseMarkPer10Pages);
    if (isNaN(numericVal) || numericVal <= 0) {
      return NextResponse.json({ error: 'Please enter a valid base mark per 10 pages (e.g. 1.0, 2.0).' }, { status: 400 });
    }

    const updated = await prisma.systemSetting.upsert({
      where: { key: 'KUTHBKHANA_BASE_MARK_PER_10_PAGES' },
      create: {
        key: 'KUTHBKHANA_BASE_MARK_PER_10_PAGES',
        value: numericVal.toString(),
        description: 'Base SPR point awarded per 10 pages read in Kuthbkhana reading program.',
      },
      update: {
        value: numericVal.toString(),
      },
    });

    logAuditAction({
      userId: user.id,
      userName: user.name,
      action: 'UPDATE_SETTING',
      entity: 'SystemSetting',
      entityId: updated.id,
      newValue: { baseMarkPer10Pages: numericVal },
    });

    return NextResponse.json({
      success: true,
      message: `Base mark for 10 pages updated to ${numericVal} points.`,
      baseMarkPer10Pages: numericVal,
    });
  } catch (error: any) {
    console.error('Kuthbkhana settings POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update settings.' }, { status: 500 });
  }
}
