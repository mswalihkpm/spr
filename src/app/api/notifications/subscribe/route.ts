export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateStudentRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const VALID_DEVICE_TYPES = ['ANDROID_TWA', 'CHROME', 'SAFARI', 'EDGE', 'FIREFOX', 'WEB'] as const;

/**
 * GET /api/notifications/subscribe
 *
 * Verifies whether an FCM token is currently active and belongs to the authenticated student.
 * Guarantees:
 * 1. Strict student session authentication.
 * 2. If fcmToken is supplied: returns isSubscribed: true ONLY if subscription exists,
 *    isActive: true, and studentAccountId strictly matches the authenticated session.
 * 3. Never leaks ownership identity of tokens belonging to staff or other students.
 */
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const fcmToken = searchParams.get('fcmToken');

    if (fcmToken && fcmToken.trim()) {
      const cleanToken = fcmToken.trim();
      const sub = await prisma.pushSubscription.findUnique({
        where: { fcmToken: cleanToken },
        select: {
          id: true,
          studentAccountId: true,
          isActive: true,
          deviceType: true,
        },
      });

      const isSubscribed = Boolean(
        sub &&
        sub.studentAccountId === student.studentAccountId &&
        sub.isActive
      );

      return NextResponse.json({
        isSubscribed,
        deviceType: isSubscribed ? sub?.deviceType : null,
      });
    }

    const activeCount = await prisma.pushSubscription.count({
      where: {
        studentAccountId: student.studentAccountId,
        isActive: true,
      },
    });

    return NextResponse.json({
      isSubscribed: activeCount > 0,
      activeSubscriptionsCount: activeCount,
    });
  } catch (error: unknown) {
    console.error('Check push subscription status error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while checking subscription status.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/subscribe
 *
 * Registers or reassigns an FCM push subscription for an authenticated student.
 *
 * Security & Ownership Rules (Stage 4.1):
 * 1. Strict student authentication required via `authenticateStudentRequest`.
 * 2. Ownership derived strictly from the verified server JWT session (`student.studentAccountId`).
 * 3. Client-supplied ownership fields (studentAccountId, studentId, userId) are ignored.
 * 4. Staff token takeover protection: If the token belongs to a staff user (`userId !== null`),
 *    the request is strictly rejected with HTTP 409 Conflict without modifying the record.
 * 5. Reassignment: If the token belongs to a student account (or same student), safe reassignment
 *    to the authenticated student account is permitted (shared-device scenario).
 * 6. Concurrency & Race-Condition Safety: Handles concurrent token registration races (P2002)
 *    and guards against concurrent staff claims using atomic conditional updates.
 * 7. Upholds the database CHECK constraint: `studentAccountId` is set, `userId` is strictly null.
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

    const { fcmToken, deviceType } = body;

    // Validate FCM registration token
    if (!fcmToken || typeof fcmToken !== 'string' || !fcmToken.trim()) {
      return NextResponse.json(
        { error: 'fcmToken is required and must be a non-empty string.' },
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

    // Validate device type
    let cleanDeviceType = 'WEB';
    if (typeof deviceType === 'string' && deviceType.trim()) {
      const upper = deviceType.trim().toUpperCase();
      if ((VALID_DEVICE_TYPES as readonly string[]).includes(upper)) {
        cleanDeviceType = upper;
      }
    }

    // Capture User-Agent header safely
    const rawUserAgent = req.headers.get('user-agent')?.trim() || null;
    const cleanUserAgent = rawUserAgent ? rawUserAgent.slice(0, 500) : null;

    // Inspect existing subscription to prevent staff token takeover
    const existing = await prisma.pushSubscription.findUnique({
      where: { fcmToken: cleanToken },
    });

    if (existing) {
      // Rule 4: If the token belongs to a staff member, reject with HTTP 409 Conflict
      if (existing.userId !== null) {
        return NextResponse.json(
          { error: 'This device token is registered to a staff account and cannot be claimed by a student.' },
          { status: 409 }
        );
      }

      // Rule 5: If it belongs to a student account, reassign safely to the authenticated student
      // Concurrency guard: update only if userId is still null
      const updated = await prisma.pushSubscription.update({
        where: {
          id: existing.id,
          userId: null,
        },
        data: {
          studentAccountId: student.studentAccountId,
          userId: null,
          deviceType: cleanDeviceType,
          userAgent: cleanUserAgent || undefined,
          isActive: true,
          lastActiveAt: new Date(),
        },
      });

      // Ensure default notification preferences exist for this student account
      await prisma.notificationPreference.upsert({
        where: { studentAccountId: student.studentAccountId },
        create: {
          studentAccountId: student.studentAccountId,
          academicAlerts: true,
          examAlerts: true,
          taskAlerts: true,
          announcements: true,
        },
        update: {},
      });

      return NextResponse.json({
        success: true,
        message: 'Push subscription registered successfully.',
        subscription: {
          id: updated.id,
          deviceType: updated.deviceType,
          isActive: updated.isActive,
        },
      });
    }

    // Rule 3: Token does not exist -> create student-owned subscription
    try {
      const created = await prisma.pushSubscription.create({
        data: {
          fcmToken: cleanToken,
          studentAccountId: student.studentAccountId,
          userId: null,
          deviceType: cleanDeviceType,
          userAgent: cleanUserAgent,
          isActive: true,
          lastActiveAt: new Date(),
        },
      });

      // Ensure default notification preferences exist for this student account
      await prisma.notificationPreference.upsert({
        where: { studentAccountId: student.studentAccountId },
        create: {
          studentAccountId: student.studentAccountId,
          academicAlerts: true,
          examAlerts: true,
          taskAlerts: true,
          announcements: true,
        },
        update: {},
      });

      return NextResponse.json({
        success: true,
        message: 'Push subscription registered successfully.',
        subscription: {
          id: created.id,
          deviceType: created.deviceType,
          isActive: created.isActive,
        },
      });
    } catch (err: unknown) {
      // Rule 6: Handle concurrent insert race condition (P2002 unique constraint violation)
      const isUniqueConstraintError =
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002';

      if (isUniqueConstraintError) {
        // Re-query the token that was concurrently inserted
        const racingRecord = await prisma.pushSubscription.findUnique({
          where: { fcmToken: cleanToken },
        });

        if (racingRecord && racingRecord.userId !== null) {
          return NextResponse.json(
            { error: 'This device token is registered to a staff account and cannot be claimed by a student.' },
            { status: 409 }
          );
        }

        if (racingRecord) {
          const updated = await prisma.pushSubscription.update({
            where: {
              id: racingRecord.id,
              userId: null,
            },
            data: {
              studentAccountId: student.studentAccountId,
              userId: null,
              deviceType: cleanDeviceType,
              userAgent: cleanUserAgent || undefined,
              isActive: true,
              lastActiveAt: new Date(),
            },
          });

          return NextResponse.json({
            success: true,
            message: 'Push subscription registered successfully.',
            subscription: {
              id: updated.id,
              deviceType: updated.deviceType,
              isActive: updated.isActive,
            },
          });
        }
      }

      throw err;
    }
  } catch (error: unknown) {
    console.error('Push notification subscription error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while registering the notification subscription.' },
      { status: 500 }
    );
  }
}
