export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncLibraryLeaderboardToSPR } from '@/lib/library-sync';
import { invalidateEngineCache } from '@/lib/spr-engine';
import { logAuditAction } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const syncResult = await syncLibraryLeaderboardToSPR();

    invalidateEngineCache();

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${syncResult.importedCount} readers from Imthiyaaz Library!`,
      importedCount: syncResult.importedCount,
      totalLeaderboardEntries: syncResult.totalLeaderboardEntries,
      notice: syncResult.notice,
    });
  } catch (syncErr: any) {
    console.error('Library live sync error:', syncErr);
    return NextResponse.json(
      { error: syncErr.message || 'Failed to sync with Imthiyaaz Library Leaderboard.' },
      { status: 500 }
    );
  }
}
