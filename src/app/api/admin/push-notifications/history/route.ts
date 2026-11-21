export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/push-notifications/history
 *
 * Retrieves paginated audit log history of dispatched push notifications.
 *
 * Security & Privacy Guarantees:
 * 1. Strict administrator authorization guard via `authenticateApiRequest(req, 'ADMIN')`.
 * 2. Never exposes device tokens, endpoints or private cryptographic keys.
 * 3. Does not expose confidential student marks, grades, or personal contact info.
 * 4. Strictly validates and caps pagination limits (page >= 1, 1 <= limit <= 100).
 */
export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) {
      return errorResponse;
    }
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    // Validate pagination inputs
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') || '20', 10);

    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 && rawLimit <= 100 ? rawLimit : 20;
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      prisma.notificationLog.count(),
      prisma.notificationLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          body: true,
          category: true,
          targetType: true,
          targetClassId: true,
          targetClass: {
            select: { id: true, name: true },
          },
          targetStudentId: true,
          targetStudent: {
            select: { id: true, fullName: true, sprStudentId: true },
          },
          deepLink: true,
          senderId: true,
          sender: {
            select: { id: true, name: true, email: true },
          },
          recipientCount: true,
          fcmAcceptedCount: true,
          failureCount: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      history: logs,
    });
  } catch (error: unknown) {
    console.error('Fetch notification history error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching notification history.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/push-notifications/history
 *
 * Deletes one or more pushed notification records by ID.
 *
 * Security & Authorization:
 * 1. Strict administrator authorization guard via `authenticateApiRequest(req, 'ADMIN')`.
 * 2. Requires exact notification ID or list of IDs (prevents broad or accidental deletions).
 * 3. Deletes record atomically from NotificationLog table.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) {
      return errorResponse;
    }
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get('id');

    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch {
      // Body may be empty if id is passed via query string
    }

    const id = queryId || bodyData?.id;
    const ids: string[] = Array.isArray(bodyData?.ids)
      ? bodyData.ids
      : typeof id === 'string' && id.trim()
      ? [id.trim()]
      : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'Notification ID or list of IDs is required.' },
        { status: 400 }
      );
    }

    // Atomically delete matching notification logs
    const result = await prisma.notificationLog.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Notification log not found or already deleted.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `Successfully deleted ${result.count} notification record${result.count > 1 ? 's' : ''}.`,
    });
  } catch (error: unknown) {
    console.error('Delete notification log error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting notification log.' },
      { status: 500 }
    );
  }
}
