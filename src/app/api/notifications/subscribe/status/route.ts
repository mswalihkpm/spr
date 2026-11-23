export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateStudentRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Safely redact FCM token to prevent token exposure in server logs.
 */
function redactToken(token?: string | null): string {
  if (!token || typeof token !== 'string') return '[empty]';
  const trimmed = token.trim();
  if (trimmed.length <= 10) return '***';
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

/**
 * POST /api/notifications/subscribe/status
 *
 * Securely checks whether an FCM push token is actively registered and linked
 * on the server, without exposing the token in URL query strings, server access logs,
 * or referrers.
 *
 * Guarantees:
 * 1. Authenticated Student: Verifies if the token is active and linked to the authenticated student account.
 * 2. Anonymous Visitor: If unauthenticated, verifies if the token is an active anonymous subscription.
 * 3. Never leaks staff subscription identity or cross-account data.
 * 4. Never logs complete FCM tokens.
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
        { error: 'fcmToken is required and must be a non-empty string in the request body.' },
        { status: 400 }
      );
    }

    const cleanToken = fcmToken.trim();
    if (cleanToken.length < 10 || cleanToken.length > 4096) {
      return NextResponse.json(
        { error: 'fcmToken has an invalid length.' },
        { status: 400 }
      );
    }

    // Branch 1: Authenticated Student Verification
    if (student?.studentAccountId) {
      const sub = await prisma.pushSubscription.findUnique({
        where: { fcmToken: cleanToken },
        select: {
          id: true,
          studentAccountId: true,
          isAnonymous: true,
          isActive: true,
          deviceType: true,
          userId: true,
        },
      });

      const isSubscribed = Boolean(
        sub &&
        sub.studentAccountId === student.studentAccountId &&
        sub.isActive &&
        !sub.isAnonymous &&
        sub.userId === null
      );

      return NextResponse.json({
        isSubscribed,
        deviceType: isSubscribed ? sub?.deviceType : null,
        isAnonymous: false,
      });
    }

    // Branch 2: Anonymous Visitor Device Verification
    const sub = await prisma.pushSubscription.findUnique({
      where: { fcmToken: cleanToken },
      select: {
        id: true,
        studentAccountId: true,
        isAnonymous: true,
        isActive: true,
        deviceType: true,
        userId: true,
      },
    });

    const isSubscribed = Boolean(
      sub &&
      sub.isAnonymous &&
      sub.isActive &&
      sub.studentAccountId === null &&
      sub.userId === null
    );

    return NextResponse.json({
      isSubscribed,
      deviceType: isSubscribed ? sub?.deviceType : null,
      isAnonymous: true,
    });
  } catch (error: unknown) {
    console.error('Subscription status check error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'An unexpected error occurred while checking subscription status.' },
      { status: 500 }
    );
  }
}
