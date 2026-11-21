export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFirebaseAdminMessaging, isFirebaseAdminConfigured } from '@/lib/firebase-admin';

const VALID_CATEGORIES = ['GENERAL', 'ACADEMIC', 'EXAM', 'TASK', 'EVENT'] as const;
type NotificationCategory = (typeof VALID_CATEGORIES)[number];

const VALID_TARGET_TYPES = [
  'ALL_GENERAL_SUBSCRIBERS',
  'ALL_STUDENTS',
  'STUDENT_TARGETED',
  'CLASS',
  'CLASS_TARGETED',
  'INDIVIDUAL',
] as const;
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
 * Sends push notifications based on cohort targeting.
 *
 * Targeting Separation Rules:
 * A. ALL_GENERAL_SUBSCRIBERS:
 *    - Reaches anonymous opted-in devices + all enrolled student devices.
 *    - Restricted to GENERAL and EVENT categories. Never permitted for academic, exam, or task alerts.
 * B. STUDENT_TARGETED (or ALL_STUDENTS):
 *    - Reaches authenticated student subscriptions only. Anonymous devices are strictly excluded.
 * C. CLASS_TARGETED (or CLASS):
 *    - Reaches eligible student subscriptions belonging to the selected class.
 * D. INDIVIDUAL:
 *    - Reaches subscriptions belonging to the selected individual student.
 *
 * Privacy Guarantees:
 * - Student marks, personal credentials and private records are never broadcast.
 * - Anonymous devices never receive private student alerts.
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
    if (rawTarget === 'ALL_GENERAL_SUBSCRIBERS' || rawTarget === 'ALL_GENERAL') {
      cleanTargetType = 'ALL_GENERAL_SUBSCRIBERS';
    } else if (rawTarget === 'ALL' || rawTarget === 'ALL_STUDENTS' || rawTarget === 'STUDENT_TARGETED') {
      cleanTargetType = 'ALL_STUDENTS';
    } else if (rawTarget === 'CLASS' || rawTarget === 'CLASS_TARGETED') {
      cleanTargetType = 'CLASS';
    } else if (rawTarget === 'INDIVIDUAL') {
      cleanTargetType = 'INDIVIDUAL';
    } else {
      return NextResponse.json(
        { error: "Invalid targetType. Must be 'ALL_GENERAL_SUBSCRIBERS', 'ALL_STUDENTS', 'CLASS', or 'INDIVIDUAL'." },
        { status: 400 }
      );
    }

    // Privacy Guard: General subscribers cannot be targeted with private student categories
    if (cleanTargetType === 'ALL_GENERAL_SUBSCRIBERS' && cleanCategory !== 'GENERAL' && cleanCategory !== 'EVENT') {
      return NextResponse.json(
        { error: 'Academic, exam, and task notifications cannot be sent to general/anonymous subscribers.' },
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
    const targetTokens: Array<{ subscriptionId: string; fcmToken: string; studentAccountId?: string | null }> = [];
    const seenTokens = new Set<string>();
    let recipientCount = 0;

    // 4. Query Eligible Subscriptions
    if (cleanTargetType === 'ALL_GENERAL_SUBSCRIBERS') {
      // 4A: Anonymous Subscribers (Strictly unowned devices only)
      const anonymousSubs = await prisma.pushSubscription.findMany({
        where: {
          isAnonymous: true,
          isActive: true,
          studentAccountId: null,
          userId: null,
        },
        select: { id: true, fcmToken: true },
      });

      for (const sub of anonymousSubs) {
        if (!sub.fcmToken || typeof sub.fcmToken !== 'string' || sub.fcmToken.trim().length < 10) continue;
        const cleanToken = sub.fcmToken.trim();
        if (!seenTokens.has(cleanToken)) {
          seenTokens.add(cleanToken);
          targetTokens.push({ subscriptionId: sub.id, fcmToken: cleanToken, studentAccountId: null });
          recipientCount++;
        }
      }

      // 4B: Enrolled Students who have announcements enabled
      const enrolledStudents = await prisma.student.findMany({
        where: { status: 'ACTIVE' },
        select: {
          account: {
            select: {
              id: true,
              status: true,
              isActivated: true,
              notificationPreference: { select: { announcements: true } },
              pushSubscriptions: {
                where: { isActive: true, isAnonymous: false, userId: null },
                select: { id: true, fcmToken: true, isAnonymous: true, studentAccountId: true, userId: true },
              },
            },
          },
        },
      });

      for (const std of enrolledStudents) {
        if (!std.account || std.account.status !== 'ACTIVE' || !std.account.isActivated) continue;
        if (std.account.notificationPreference && std.account.notificationPreference.announcements === false) continue;

        if (std.account.pushSubscriptions && std.account.pushSubscriptions.length > 0) {
          let hasValidToken = false;
          for (const sub of std.account.pushSubscriptions) {
            // Defense-in-depth validation: verify ownership and exclude invalid records
            if (sub.isAnonymous !== false || sub.userId !== null || sub.studentAccountId !== std.account.id) continue;
            if (!sub.fcmToken || typeof sub.fcmToken !== 'string' || sub.fcmToken.trim().length < 10) continue;

            const cleanToken = sub.fcmToken.trim();
            if (!seenTokens.has(cleanToken)) {
              seenTokens.add(cleanToken);
              targetTokens.push({ subscriptionId: sub.id, fcmToken: cleanToken, studentAccountId: std.account.id });
              hasValidToken = true;
            }
          }
          if (hasValidToken) {
            recipientCount++;
          }
        }
      }
    } else {
      // 4C: Student-Targeted (ALL_STUDENTS, CLASS, INDIVIDUAL)
      const preferenceField = getPreferenceFieldForCategory(cleanCategory);
      const studentWhereClause: Record<string, unknown> = { status: 'ACTIVE' };

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
                where: { isActive: true, isAnonymous: false, userId: null },
                select: { id: true, fcmToken: true, isAnonymous: true, studentAccountId: true, userId: true, isActive: true },
              },
            },
          },
        },
      });

      for (const student of eligibleStudents) {
        if (!student.account || student.account.status !== 'ACTIVE' || !student.account.isActivated) {
          continue;
        }

        const pref = student.account.notificationPreference;
        if (pref && pref[preferenceField] === false) {
          continue;
        }

        const activeSubs = student.account.pushSubscriptions;
        if (activeSubs && activeSubs.length > 0) {
          let hasValidToken = false;
          for (const sub of activeSubs) {
            // Defense-in-depth:
            // 1. Strictly exclude anonymous subscriptions
            if (sub.isAnonymous !== false) continue;
            // 2. Reject subscriptions with invalid ownership state or mismatched studentAccountId
            if (!sub.studentAccountId || sub.studentAccountId !== student.account.id) continue;
            // 3. Never permit staff tokens in student targeted deliveries
            if (sub.userId !== null) continue;
            // 4. Must be active
            if (!sub.isActive) continue;
            // 5. Must have valid non-empty FCM token
            if (!sub.fcmToken || typeof sub.fcmToken !== 'string' || sub.fcmToken.trim().length < 10) continue;

            const cleanToken = sub.fcmToken.trim();
            if (!seenTokens.has(cleanToken)) {
              seenTokens.add(cleanToken);
              targetTokens.push({ subscriptionId: sub.id, fcmToken: cleanToken, studentAccountId: student.account.id });
              hasValidToken = true;
            }
          }
          if (hasValidToken) {
            recipientCount++;
          }
        }
      }
    }

    // 5. Firebase Dispatch with Just-In-Time Pre-Flight Authorization
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

          const fcmDataPayload: Record<string, string> = {
            title: cleanTitle,
            body: cleanBody,
            url: cleanDeepLink,
            category: cleanCategory,
            tag: `spr-${cleanCategory.toLowerCase()}`,
          };

          for (let i = 0; i < targetTokens.length; i += 500) {
            const batch = targetTokens.slice(i, i + 500);

            // JIT Pre-Flight Authorization Check:
            // Re-verify that every subscription in this batch is STILL active and still bound
            // to the intended student immediately before socket transmission to Google FCM.
            let authorizedBatch = batch;
            if (cleanTargetType !== 'ALL_GENERAL_SUBSCRIBERS') {
              try {
                const batchSubIds = batch.map((b) => b.subscriptionId);
                const liveSubs = await prisma.pushSubscription.findMany({
                  where: {
                    id: { in: batchSubIds },
                    isActive: true,
                    isAnonymous: false,
                    userId: null,
                  },
                  select: { id: true, studentAccountId: true, fcmToken: true },
                });
                const liveMap = new Map(liveSubs.map((s) => [s.id, s]));

                authorizedBatch = batch.filter((item) => {
                  const live = liveMap.get(item.subscriptionId);
                  if (!live) return false;
                  // Reject if student logged out or if device was rebound to another student
                  if (item.studentAccountId && live.studentAccountId !== item.studentAccountId) {
                    return false;
                  }
                  return true;
                });
              } catch (verifyErr) {
                console.warn('Pre-flight dispatch authorization check encountered database error:', verifyErr);
                // Fail-safe: if database cannot verify authorization, do NOT send unverified private messages
                continue;
              }
            } else {
              // For general broadcasts, verify subscription is still active
              try {
                const batchSubIds = batch.map((b) => b.subscriptionId);
                const activeLiveSubs = await prisma.pushSubscription.findMany({
                  where: {
                    id: { in: batchSubIds },
                    isActive: true,
                  },
                  select: { id: true },
                });
                const activeSet = new Set(activeLiveSubs.map((s) => s.id));
                authorizedBatch = batch.filter((item) => activeSet.has(item.subscriptionId));
              } catch (verifyErr) {
                console.warn('Pre-flight general broadcast verification error:', verifyErr);
              }
            }

            if (authorizedBatch.length === 0) {
              continue;
            }

            const tokenList = authorizedBatch.map((b) => b.fcmToken);

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
                    invalidTokens.push(authorizedBatch[idx]);
                  }
                }
              });
            } catch (batchErr) {
              console.error('Batch send error:', batchErr);
              failureCount += authorizedBatch.length;
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
    } else {
      dispatchStatus = 'SENT';
    }

    // 6. Prune invalid tokens safely
    if (invalidTokens.length > 0) {
      try {
        const subIdsToDeactivate = invalidTokens.map((t) => t.subscriptionId);
        await prisma.pushSubscription.updateMany({
          where: { id: { in: subIdsToDeactivate } },
          data: { isActive: false, lastActiveAt: new Date() },
        });
      } catch (pruneErr) {
        console.warn('Pruning invalid FCM tokens encountered error:', pruneErr);
      }
    }

    // 7. Persist Notification Log in Database
    try {
      await prisma.notificationLog.create({
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
    } catch (logErr) {
      console.error('Failed to persist NotificationLog record:', logErr);
    }

    return NextResponse.json({
      success: dispatchStatus === 'SENT' || dispatchStatus === 'PARTIAL_FAILURE',
      status: dispatchStatus,
      recipientCount,
      fcmAcceptedCount,
      failureCount,
      message:
        dispatchStatus === 'SENT'
          ? 'Notification dispatched successfully to all target subscribers.'
          : dispatchStatus === 'PARTIAL_FAILURE'
          ? 'Notification dispatched with partial delivery failures.'
          : 'Failed to dispatch notification to FCM.',
    });
  } catch (error: unknown) {
    console.error('Send push notifications error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing push notification dispatch.' },
      { status: 500 }
    );
  }
}
