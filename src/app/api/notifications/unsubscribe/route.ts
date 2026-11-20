export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateStudentRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/notifications/unsubscribe
 *
 * Deactivates an existing push subscription token for the authenticated student.
 *
 * Security & Ownership Rules (Stage 4.1):
 * 1. Strict student authentication required: returns HTTP 401 if unauthenticated.
 * 2. Ownership derived strictly from the verified server JWT session (`student.studentAccountId`).
 * 3. Never deactivates staff subscriptions or subscriptions belonging to other students:
 *    the database query requires BOTH `fcmToken` and `studentAccountId`.
 * 4. Preserves database foreign keys and CHECK constraint by setting only `isActive: false`
 *    and `lastActiveAt`, without altering ownership IDs.
 * 5. Returns a generic success response without leaking whether the token was found or belongs
 *    to another account.
 * 6. No public logout bypass or client-supplied ownership IDs are accepted.
 */
export async function POST(req: NextRequest) {
  try {
    const { student, errorResponse } = await authenticateStudentRequest(req);
    if (errorResponse) {
      return errorResponse;
    }
    if (!student || !student.studentAccountId) {
      return NextResponse.json(
        { error: 'Student authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    const { fcmToken } = body;
    if (!fcmToken || typeof fcmToken !== 'string' || !fcmToken.trim()) {
      return NextResponse.json(
        { error: 'fcmToken is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    const cleanToken = fcmToken.trim();

    // Deactivate ONLY if the record matches BOTH fcmToken AND studentAccountId.
    // Staff records (where userId is set) or other students' records will not match.
    await prisma.pushSubscription.updateMany({
      where: {
        fcmToken: cleanToken,
        studentAccountId: student.studentAccountId,
      },
      data: {
        isActive: false,
        lastActiveAt: new Date(),
      },
    });

    // Generic success response to prevent ownership enumeration
    return NextResponse.json({
      success: true,
      message: 'Push subscription deactivated.',
    });
  } catch (error: unknown) {
    console.error('Push notification unsubscribe error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deactivating the notification subscription.' },
      { status: 500 }
    );
  }
}
