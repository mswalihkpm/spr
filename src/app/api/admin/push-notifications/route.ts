export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFirebaseAdminMessaging, isFirebaseAdminConfigured } from '@/lib/firebase-admin';

const VALID_CATEGORIES = ['GENERAL', 'ACADEMIC', 'EXAM', 'TASK', 'EVENT'] as const;
type NotificationCategory = (typeof VALID_CATEGORIES)[number];

const VALID_TARGET_TYPES = ['ALL_STUDENTS', 'CLASS', 'INDIVIDUAL'] as const;
type TargetType = (typeof VALID_TARGET_TYPES)[number];

function getPreferenceFieldForCategory(category: NotificationCategory): 'academicAlerts' | 'examAlerts' | 'taskAlerts' | 'announcements' {
  switch (category) {
    case 'ACADEMIC':
      return 'academicAlerts';
    case 'EXAM':
      return 'examAlerts';
    case 'TASK':
      return 'taskAlerts';
    case 'GENERAL':
    case 'EVENT':
    default:
      return 'announcements';
  }
}

function sanitizeDeepLink(link?: unknown): string {
  if (!link || typeof link !== 'string') return '/student/dashboard';
  const trimmed = link.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed.slice(0, 200);
  }
  return '/student/dashboard';
}

/**
 * POST /api/admin/push-notifications
 *
 * Sends push notifications to students based on cohort targeting.
 *
 * Security & Reliability Guarantees:
 * 1. Requires verified ADMIN or SUPER_ADMIN session via `authenticateApiRequest(req, 'ADMIN')`.
 * 2. Derives sender identity strictly from server JWT (`user.userId`).
 * 3. Validates target academic class or student existence against database.
 * 4. Respects student category preferences (filters out opted-out students).
 * 5. Sends data-only FCM messages to avoid duplicate notifications with public/sw.js.
 * 6. Never includes marks, grades, personal passwords or confidential records in payloads.
 * 7. Prunes invalid or unregistered FCM tokens matching exact subscription ID.
 * 8. Persists delivery attempt in NotificationLog with FCM accepted count (not device delivery).
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Strict Administrator Authorization Guard
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) {
      return errorResponse;
    }
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // 2. Parse & Validate Payload
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload.' }, { status: 400 });
    }

    const { title, body: messageBody, category, targetType, targetClassId, targetStudentId, deepLink } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required and must be a non-empty string.' }, { status: 400 });
    }
    const cleanTitle = title.trim().slice(0, 100);

    if (!messageBody || typeof messageBody !== 'string' || !messageBody.trim()) {
      return NextResponse.json({ error: 'Body is required and must be a non-empty string.' }, { status: 400 });
    }
    const cleanBody = messageBody.trim().slice(0, 500);

    // Validate category
    let cleanCategory: NotificationCategory = 'GENERAL';
    if (typeof category === 'string' && (VALID_CATEGORIES as readonly string[]).includes(category.trim().toUpperCase())) {
      cleanCategory = category.trim().toUpperCase() as NotificationCategory;
    }

    // Validate targetType
    let cleanTargetType: TargetType = 'ALL_STUDENTS';
    const rawTarget = typeof targetType === 'string' ? targetType.trim().toUpperCase() : '';
    if (rawTarget === 'ALL' || rawTarget === 'ALL_STUDENTS') {
      cleanTargetType = 'ALL_STUDENTS';
    } else if (rawTarget === 'CLASS') {
      cleanTargetType = 'CLASS';
    } else if (rawTarget === 'INDIVIDUAL') {
      cleanTargetType = 'INDIVIDUAL';
    } else {
      return NextResponse.json(
        { error: "Invalid targetType. Must be 'ALL_STUDENTS', 'CLASS', or 'INDIVIDUAL'." },
        { status: 400 }
      );
    }

    // 3. Validate Target Existence in Database
    let validatedClassId: string | null = null;
    let validatedStudentId: string | null = null;

    if (cleanTargetType === 'CLASS') {
      if (!targetClassId || typeof targetClassId !== 'string') {
        return NextResponse.json({ error: 'targetClassId is required when targeting by CLASS.' }, { status: 400 });
      }
      const cls = await prisma.academicClass.findUnique({
        where: { id: targetClassId.trim() },
        select: { id: true },
      });
      if (!cls) {
        return NextResponse.json({ error: 'Target academic class does not exist.' }, { status: 400 });
      }
      validatedClassId = cls.id;
    } else if (cleanTargetType === 'INDIVIDUAL') {
      if (!targetStudentId || typeof targetStudentId !== 'string') {
        return NextResponse.json({ error: 'targetStudentId is required when targeting by INDIVIDUAL.' }, { status: 400 });
      }
      const std = await prisma.student.findUnique({
        where: { id: targetStudentId.trim() },
        select: { id: true, status: true },
      });
      if (!std) {
        return NextResponse.json({ error: 'Target student does not exist.' }, { status: 400 });
      }
      validatedStudentId = std.id;
    }

    const cleanDeepLink = sanitizeDeepLink(deepLink);

    // 4. Query Eligible Students and Respect Preferences
    const preferenceField = getPreferenceFieldForCategory(cleanCategory);

    const studentWhereClause: Record<string, unknown> = {
      status: 'ACTIVE',
    };
    if (cleanTargetType === 'CLASS' && validatedClassId) {
      studentWhereClause.classId = validatedClassId;
    } else if (cleanTargetType === 'INDIVIDUAL' && validatedStudentId) {
      studentWhereClause.id = validatedStudentId;
    }

    const eligibleStudents = await prisma.student.findMany({
      where: studentWhereClause,
      select: {
        id: true,
        account: {
          select: {
            id: true,
            status: true,
            isActivated: true,
            notificationPreference: {
              select: {
                academicAlerts: true,
                examAlerts: true,
                taskAlerts: true,
                announcements: true,
              },
            },
            pushSubscriptions: {
              where: { isActive: true },
              select: { id: true, fcmToken: true },
            },
          },
        },
      },
    });

    const targetTokens: Array<{ subscriptionId: string; fcmToken: string }> = [];
    let recipientCount = 0;

    for (const student of eligibleStudents) {
      if (!student.account || student.account.status !== 'ACTIVE' || !student.account.isActivated) {
        continue;
      }

      // Check student notification preference
      const pref = student.account.notificationPreference;
      if (pref && pref[preferenceField] === false) {
        // Opted out of this category
        continue;
      }

      const activeSubs = student.account.pushSubscriptions;
      if (activeSubs && activeSubs.length > 0) {
        recipientCount++;
        for (const sub of activeSubs) {
          targetTokens.push({ subscriptionId: sub.id, fcmToken: sub.fcmToken });
        }
      }
    }

    // 5. Firebase Dispatch
    let fcmAcceptedCount = 0;
    let failureCount = 0;
    let dispatchStatus = 'SENT';
    const invalidTokens: Array<{ subscriptionId: string; fcmToken: string }> = [];

    if (targetTokens.length > 0) {
      if (!isFirebaseAdminConfigured()) {
        dispatchStatus = 'FAILED';
        failureCount = targetTokens.length;
        console.error('Firebase Cloud Messaging is not configured on the server.');
      } else {
        try {
          const messaging = getFirebaseAdminMessaging();

          // Data-only message payload to prevent duplicate notifications with public/sw.js
          const fcmDataPayload: Record<string, string> = {
            title: cleanTitle,
            body: cleanBody,
            url: cleanDeepLink,
            category: cleanCategory,
            tag: `spr-${cleanCategory.toLowerCase()}`,
          };

          // Multicast batches of 500
          for (let i = 0; i < targetTokens.length; i += 500) {
            const batch = targetTokens.slice(i, i + 500);
            const tokenList = batch.map((b) => b.fcmToken);

            try {
              const multicastResponse = await messaging.sendEachForMulticast({
                tokens: tokenList,
                data: fcmDataPayload,
              });

              fcmAcceptedCount += multicastResponse.successCount;
              failureCount += multicastResponse.failureCount;

              multicastResponse.responses.forEach((resp, idx) => {
                if (!resp.success && resp.error) {
                  const code = resp.error.code;
                  if (
                    code === 'messaging/registration-token-not-registered' ||
                    code === 'messaging/invalid-registration-token'
                  ) {
                    invalidTokens.push(batch[idx]);
                  }
                }
              });
            } catch (batchErr) {
              console.error('Batch send error:', batchErr);
              failureCount += batch.length;
            }
          }

          if (failureCount > 0) {
            dispatchStatus = fcmAcceptedCount > 0 ? 'PARTIAL_FAILURE' : 'FAILED';
          }
        } catch (fcmErr) {
          console.error('Firebase messaging dispatch error:', fcmErr);
          dispatchStatus = 'FAILED';
          failureCount = targetTokens.length;
        }
      }
    }

    // 6. Prune invalid tokens safely matching both subscription ID and fcmToken
    if (invalidTokens.length > 0) {
      await Promise.allSettled(
        invalidTokens.map((item) =>
          prisma.pushSubscription.updateMany({
            where: {
              id: item.subscriptionId,
              fcmToken: item.fcmToken,
            },
            data: {
              isActive: false,
              lastActiveAt: new Date(),
            },
          })
        )
      );
    }

    // 7. Persist NotificationLog Audit Record
    const notificationLog = await prisma.notificationLog.create({
      data: {
        title: cleanTitle,
        body: cleanBody,
        category: cleanCategory,
        targetType: cleanTargetType,
        targetClassId: validatedClassId,
        targetStudentId: validatedStudentId,
        deepLink: cleanDeepLink,
        senderId: user.id,
        recipientCount,
        fcmAcceptedCount,
        failureCount,
        status: dispatchStatus,
      },
    });

    return NextResponse.json({
      success: dispatchStatus !== 'FAILED',
      message:
        dispatchStatus === 'FAILED'
          ? 'Notification dispatch failed or service not configured.'
          : 'Notification processed successfully. FCM accepted message count recorded.',
      log: {
        id: notificationLog.id,
        recipientCount,
        fcmAcceptedCount,
        failureCount,
        status: dispatchStatus,
        createdAt: notificationLog.createdAt,
      },
    });
  } catch (error: unknown) {
    console.error('Admin push notification dispatch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing the push notification request.' },
      { status: 500 }
    );
  }
}
