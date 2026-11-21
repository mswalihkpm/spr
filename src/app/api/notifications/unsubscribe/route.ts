export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateStudentRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/notifications/unsubscribe
 *
 * Deactivates an existing push subscription token for an authenticated student
 * or an anonymous visitor.
 *
 * Security & Ownership Rules:
 * 1. Authenticated Student: Deactivates ONLY if fcmToken matches AND studentAccountId matches.
 * 2. Anonymous Visitor: Deactivates ONLY if fcmToken matches AND isAnonymous is true.
 * 3. Never alters or deactivates staff subscriptions (userId !== null).
 * 4. Preserves database records and ownership foreign keys by setting isActive: false.
 */
export async function POST(req: NextRequest) {
  try {
    const { student } = await authenticateStudentRequest(req);

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

    if (student?.studentAccountId) {
      // Deactivate student's subscription
      await prisma.pushSubscription.updateMany({
        where: {
          fcmToken: cleanToken,
          studentAccountId: student.studentAccountId,
          isActive: true,
        },
        data: {
          isActive: false,
          lastActiveAt: new Date(),
        },
      });
    } else {
      // Deactivate anonymous subscription
      await prisma.pushSubscription.updateMany({
        where: {
          fcmToken: cleanToken,
          isAnonymous: true,
          isActive: true,
        },
        data: {
          isActive: false,
          lastActiveAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Unsubscribed successfully.',
    });
  } catch (error: unknown) {
    console.error('Push notification unsubscribe error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing unsubscription.' },
      { status: 500 }
    );
  }
}
