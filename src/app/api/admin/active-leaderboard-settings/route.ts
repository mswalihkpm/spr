export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { getActiveLeaderboardSettings, saveActiveLeaderboardSettings } from '@/lib/spr-engine';

export async function GET(req: NextRequest) {
  try {
    const settings = await getActiveLeaderboardSettings();
    return NextResponse.json({
      settings,
    });
  } catch (error: any) {
    console.error('Failed to get active leaderboard settings:', error);
    return NextResponse.json({ error: 'Failed to fetch active leaderboard settings.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const days = typeof body.days === 'number' && body.days > 0 ? body.days : 30;
    const mode = body.mode === 'DATE' ? 'DATE' : 'DAYS';
    const customDate = typeof body.customDate === 'string' && body.customDate.trim() ? body.customDate.trim() : null;

    const updatedSettings = await saveActiveLeaderboardSettings({
      days,
      mode,
      customDate,
      adminName: user.name || user.email || 'Admin',
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: 'ADMIN_UPDATE_ACTIVE_LEADERBOARD_SETTINGS',
      entity: 'SystemSetting',
      details: {
        days,
        mode,
        customDate,
        cutoffDate: updatedSettings.cutoffDate,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: `Active leaderboard updated to ${mode === 'DATE' ? `custom date ${customDate}` : `last ${days} days`}.`,
      settings: updatedSettings,
    });
  } catch (error: any) {
    console.error('Failed to save active leaderboard settings:', error);
    return NextResponse.json({ error: error.message || 'Failed to update active leaderboard settings.' }, { status: 500 });
  }
}
