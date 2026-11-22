export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateStudentRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const VALID_DEVICE_TYPES = ['ANDROID_NATIVE', 'ANDROID_TWA', 'CHROME', 'SAFARI', 'EDGE', 'FIREFOX', 'WEB'] as const;

/**
 * GET /api/notifications/subscribe
 *
 * Verifies whether an FCM token is currently active.
 *
 * Guarantees:
 * 1. Authenticated Student: Verifies if the token is active and linked to the authenticated student account.
 * 2. Anonymous Visitor: If unauthenticated, verifies if the supplied token is registered as an active anonymous subscription.
 * 3. Never leaks ownership identity or staff status.
 */
export async function GET(req: NextRequest) {
  try {
    const { student } = await authenticateStudentRequest(req);
    const { searchParams } = new URL(req.url);
    const fcmToken = searchParams.get('fcmToken');

    if (student?.studentAccountId) {
      if (fcmToken && fcmToken.trim()) {
        const cleanToken = fcmToken.trim();
        const sub = await prisma.pushSubscription.findUnique({
          where: { fcmToken: cleanToken },
          select: {
            id: true,
            studentAccountId: true,
            isAnonymous: true,
            isActive: true,
            deviceType: true,
          },
        });

        const isSubscribed = Boolean(
          sub &&
          sub.studentAccountId === student.studentAccountId &&
          sub.isActive &&
          !sub.isAnonymous
        );

        return NextResponse.json({
          isSubscribed,
          deviceType: isSubscribed ? sub?.deviceType : null,
          isAnonymous: false,
        });
      }

      const activeCount = await prisma.pushSubscription.count({
        where: {
          studentAccountId: student.studentAccountId,
          isActive: true,
          isAnonymous: false,
        },
      });

      return NextResponse.json({
        isSubscribed: activeCount > 0,
        activeSubscriptionsCount: activeCount,
        isAnonymous: false,
      });
    }

    // Unauthenticated (Anonymous Visitor check)
    if (fcmToken && fcmToken.trim()) {
      const cleanToken = fcmToken.trim();
      const sub = await prisma.pushSubscription.findUnique({
        where: { fcmToken: cleanToken },
        select: {
          id: true,
          isAnonymous: true,
          isActive: true,
          deviceType: true,
        },
      });

      const isSubscribed = Boolean(sub && sub.isAnonymous && sub.isActive);
      return NextResponse.json({
        isSubscribed,
        deviceType: isSubscribed ? sub?.deviceType : null,
        isAnonymous: true,
      });
    }

    return NextResponse.json(
      { error: 'Authentication or fcmToken query parameter required.' },
      { status: 401 }
    );
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
 * Registers or upgrades an FCM push subscription for students or anonymous visitors.
 *
 * Security & Ownership Rules:
 * 1. Authenticated Student:
 *    - Always derives studentAccountId from the verified server session JWT (never from client payload).
 *    - If the token was previously anonymous (`isAnonymous: true`), cleanly upgrades it to student-owned.
 *    - Preserves institutional announcement preferences while enabling student-specific alerts.
 *    - If the token was registered to another student (shared device), safely reassigns ownership.
 *    - If the token belongs to a staff account (`userId !== null`), rejects with HTTP 409 Conflict.
 * 2. Anonymous Visitor:
 *    - Allows unauthenticated visitors to register device for general institutional announcements.
 *    - Sets `isAnonymous: true`, `studentAccountId: null`, and `userId: null`.
 *    - If the token belongs to a staff account, rejects with HTTP 409 Conflict.
 * 3. Atomic Database Parity:
 *    - Upholds mutual exclusivity (either studentAccountId, userId, or isAnonymous = true).
 *    - Handles race conditions gracefully via P2002 constraint error recovery.
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

    const { fcmToken, deviceType, isAnonymous: requestAnonymous } = body;

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

    // Check existing subscription record to enforce ownership guards
    const existing = await prisma.pushSubscription.findUnique({
      where: { fcmToken: cleanToken },
    });

    if (existing && existing.userId !== null) {
      // Guard: Never allow student or anonymous client to claim a staff token
      return NextResponse.json(
        { error: 'This device token is registered to a staff account and cannot be claimed.' },
        { status: 409 }
      );
    }

    // -------------------------------------------------------------------------
    // BRANCH A: Authenticated Student Registration or Anonymous Upgrade
    // -------------------------------------------------------------------------
    if (student?.studentAccountId) {
      const studentAccountId = student.studentAccountId;

      if (existing) {
        // Safe update: Reassign or upgrade to authenticated student
        const updated = await prisma.pushSubscription.update({
          where: {
            id: existing.id,
            userId: null,
          },
          data: {
            studentAccountId: studentAccountId,
            userId: null,
            isAnonymous: false,
            deviceType: cleanDeviceType,
            userAgent: cleanUserAgent || undefined,
            isActive: true,
            lastActiveAt: new Date(),
          },
        });

        // Ensure default notification preferences exist for this student account
        await prisma.notificationPreference.upsert({
          where: { studentAccountId: studentAccountId },
          create: {
            studentAccountId: studentAccountId,
            academicAlerts: true,
            examAlerts: true,
            taskAlerts: true,
            announcements: true,
          },
          update: {},
        });

        return NextResponse.json({
          success: true,
          message: 'Push subscription registered successfully for student account.',
          subscription: {
            id: updated.id,
            deviceType: updated.deviceType,
            isActive: updated.isActive,
            isAnonymous: false,
          },
        });
      }

      // No existing record -> Create student-owned subscription
      try {
        const created = await prisma.pushSubscription.create({
          data: {
            fcmToken: cleanToken,
            studentAccountId: studentAccountId,
            userId: null,
            isAnonymous: false,
            deviceType: cleanDeviceType,
            userAgent: cleanUserAgent,
            isActive: true,
            lastActiveAt: new Date(),
          },
        });

        await prisma.notificationPreference.upsert({
          where: { studentAccountId: studentAccountId },
          create: {
            studentAccountId: studentAccountId,
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
            isAnonymous: false,
          },
        });
      } catch (err: unknown) {
        // Handle concurrent insert race condition (P2002)
        const isP2002 =
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code: string }).code === 'P2002';

        if (isP2002) {
          const racingRecord = await prisma.pushSubscription.findUnique({
            where: { fcmToken: cleanToken },
          });

          if (racingRecord && racingRecord.userId !== null) {
            return NextResponse.json(
              { error: 'This device token is registered to a staff account and cannot be claimed.' },
              { status: 409 }
            );
          }

          if (racingRecord) {
            const updated = await prisma.pushSubscription.update({
              where: { id: racingRecord.id, userId: null },
              data: {
                studentAccountId: studentAccountId,
                userId: null,
                isAnonymous: false,
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
                isAnonymous: false,
              },
            });
          }
        }
        throw err;
      }
    }

    // -------------------------------------------------------------------------
    // BRANCH B: Anonymous Visitor Subscription
    // -------------------------------------------------------------------------
    if (existing) {
      // If token already exists: ensure it is clean of student links and active as anonymous
      const updated = await prisma.pushSubscription.update({
        where: { id: existing.id, userId: null },
        data: {
          studentAccountId: null,
          userId: null,
          isAnonymous: true,
          deviceType: cleanDeviceType,
          userAgent: cleanUserAgent || undefined,
          isActive: true,
          lastActiveAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Anonymous institutional notification subscription registered successfully.',
        subscription: {
          id: updated.id,
          deviceType: updated.deviceType,
          isActive: updated.isActive,
          isAnonymous: true,
        },
      });
    }

    // No existing record -> Create anonymous subscription
    try {
      const created = await prisma.pushSubscription.create({
        data: {
          fcmToken: cleanToken,
          studentAccountId: null,
          userId: null,
          isAnonymous: true,
          deviceType: cleanDeviceType,
          userAgent: cleanUserAgent,
          isActive: true,
          lastActiveAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Anonymous institutional notification subscription registered successfully.',
        subscription: {
          id: created.id,
          deviceType: created.deviceType,
          isActive: created.isActive,
          isAnonymous: true,
        },
      });
    } catch (err: unknown) {
      const isP2002 =
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002';

      if (isP2002) {
        const racingRecord = await prisma.pushSubscription.findUnique({
          where: { fcmToken: cleanToken },
        });

        if (racingRecord && racingRecord.userId !== null) {
          return NextResponse.json(
            { error: 'This device token is registered to a staff account and cannot be claimed.' },
            { status: 409 }
          );
        }

        if (racingRecord) {
          const updated = await prisma.pushSubscription.update({
            where: { id: racingRecord.id, userId: null },
            data: {
              studentAccountId: null,
              userId: null,
              isAnonymous: true,
              deviceType: cleanDeviceType,
              userAgent: cleanUserAgent || undefined,
              isActive: true,
              lastActiveAt: new Date(),
            },
          });

          return NextResponse.json({
            success: true,
            message: 'Anonymous institutional notification subscription registered successfully.',
            subscription: {
              id: updated.id,
              deviceType: updated.deviceType,
              isActive: updated.isActive,
              isAnonymous: true,
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
