export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

// GET notifications
// Public: returns active notifications for homepage display
// Admin (with all=true): returns all notifications for management
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('all') === 'true';

    const whereClause: any = {};
    if (!includeInactive) {
      whereClause.active = true;
    }

    const notifications = await prisma.homepageNotification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: includeInactive ? 50 : 20,
    });

    return NextResponse.json(
      { notifications },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications.' }, { status: 500 });
  }
}

// POST create text notification (ADMIN)
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid or missing JSON request body.' }, { status: 400 });
    }

    const { text, title, active, duration } = body || {};

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Notification text is required.' }, { status: 400 });
    }

    const resolvedDuration =
      duration !== undefined ? Math.max(1, parseInt(String(duration), 10) || 5) : 5;

    const notification = await prisma.homepageNotification.create({
      data: {
        text: text.trim(),
        title: title ? title.trim() : null,
        active: active !== undefined ? Boolean(active) : true,
        duration: resolvedDuration,
        createdAt: new Date(),
      },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'CREATE',
      entity: 'HomepageNotification',
      entityId: notification.id,
      newValue: notification,
    });

    return NextResponse.json({ success: true, notification });
  } catch (error: any) {
    console.error('Create notification error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create notification.' }, { status: 500 });
  }
}

// PUT update text notification / toggle show-hide (ADMIN)
export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid or missing JSON request body.' }, { status: 400 });
    }

    const { id, text, title, active, duration } = body || {};

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
    }

    const existing = await prisma.homepageNotification.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Notification record not found.' }, { status: 404 });
    }

    const updated = await prisma.homepageNotification.update({
      where: { id },
      data: {
        ...(text !== undefined ? { text: text.trim() } : {}),
        title: title !== undefined ? (title ? title.trim() : null) : undefined,
        ...(active !== undefined ? { active: Boolean(active) } : {}),
        ...(duration !== undefined ? { duration: Math.max(1, parseInt(String(duration), 10) || 5) } : {}),
      },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'UPDATE',
      entity: 'HomepageNotification',
      entityId: id,
      previousValue: existing,
      newValue: updated,
    });

    return NextResponse.json({ success: true, notification: updated });
  } catch (error: any) {
    console.error('Update notification error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update notification.' }, { status: 500 });
  }
}

// DELETE text notification (ADMIN)
export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');

    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const idToDelete = idParam || body.id;

    if (!idToDelete) {
      return NextResponse.json({ error: 'Notification ID is required for deletion.' }, { status: 400 });
    }

    const deleted = await prisma.homepageNotification.delete({
      where: { id: idToDelete },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'DELETE',
      entity: 'HomepageNotification',
      entityId: idToDelete,
      previousValue: deleted,
    });

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully.',
    });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete notification.' }, { status: 500 });
  }
}
