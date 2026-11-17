import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const days = typeof body.days === 'number' && body.days > 0 ? body.days : 15;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const deleted = await prisma.walletTransaction.deleteMany({
      where: {
        createdAt: { gte: cutoffDate },
        NOT: {
          reference: { startsWith: 'TXN-TASK' },
        },
      },
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: 'ADMIN_CLEAN_TRANSACTION_HISTORY',
      entity: 'WalletTransaction',
      details: {
        days,
        cutoffDate: cutoffDate.toISOString(),
        deletedCount: deleted.count,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully purged ${deleted.count} transaction history records from the last ${days} days.`,
      deletedCount: deleted.count,
    });
  } catch (error: any) {
    console.error('Error cleaning transaction history:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clean transaction history.' },
      { status: 500 }
    );
  }
}
