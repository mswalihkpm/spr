export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { clearStudentCookie, authenticateStudentRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/student/auth/logout
 *
 * Logs out the authenticated student.
 *
 * Device Subscription Rules:
 * 1. Authenticates student session before clearing the session cookie.
 * 2. If an fcmToken is supplied and belongs to the logging-out student:
 *    - Reverts the device subscription to an ANONYMOUS general subscription (`isAnonymous: true, studentAccountId: null`).
 *    - Preserves general institutional announcement reception for the physical device.
 *    - Immediately prevents private student notifications (academic, exam, task) from reaching the device.
 * 3. Never alters or deactivates staff subscriptions (userId !== null).
 * 4. Always clears the student session cookie and returns HTTP 200.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the student session before clearing cookie
    const { student } = await authenticateStudentRequest(req);

    // If no active student session exists, session is already terminated or expired
    if (!student?.studentAccountId) {
      const response = NextResponse.json({
        success: true,
        message: 'No active student session found. Already logged out.',
        subscriptionRevertedToAnonymous: false,
      });
      clearStudentCookie(response);
      return response;
    }

    const studentAccountId = student.studentAccountId;

    // 2. Parse optional fcmToken from JSON body safely
    let cleanToken: string | null = null;
    try {
      const body = await req.json().catch(() => null);
      const rawToken = body?.fcmToken;
      if (typeof rawToken === 'string' && rawToken.trim().length > 0) {
        cleanToken = rawToken.trim();
      }
    } catch {
      // Body parsing error handled gracefully; cleanToken remains null
    }

    // 3. Atomically revert subscription(s) to anonymous general subscriptions in a database transaction
    let subscriptionRevertedToAnonymous = false;
    try {
      await prisma.$transaction(async (tx) => {
        if (cleanToken) {
          // If a valid fcmToken is supplied, revert only that specific device subscription
          const result = await tx.pushSubscription.updateMany({
            where: {
              fcmToken: cleanToken,
              studentAccountId: studentAccountId,
              userId: null,
            },
            data: {
              studentAccountId: null,
              userId: null,
              isAnonymous: true,
              isActive: true,
              lastActiveAt: new Date(),
            },
          });
          subscriptionRevertedToAnonymous = result.count > 0;
        } else {
          // If fcmToken is absent or invalid, fail-safe: revert all subscriptions owned by this student
          const result = await tx.pushSubscription.updateMany({
            where: {
              studentAccountId: studentAccountId,
              userId: null,
            },
            data: {
              studentAccountId: null,
              userId: null,
              isAnonymous: true,
              isActive: true,
              lastActiveAt: new Date(),
            },
          });
          subscriptionRevertedToAnonymous = result.count > 0;
        }
      });
    } catch (dbErr: unknown) {
      // Log cleanup failure safely without leaking tokens, student IDs, or PII
      const errMsg = dbErr instanceof Error ? dbErr.message : 'Database error';
      console.error('Logout: subscription reversion transaction failed:', errMsg);

      // SECURITY CRITICAL:
      // Never report logout as successful and NEVER clear authentication cookie while private
      // notification ownership remains unresolved in the database.
      return NextResponse.json(
        {
          success: false,
          error: 'LOGOUT_CLEANUP_FAILED',
          message: 'Unable to safely complete logout because device notification disassociation failed due to a database connection error. To protect private notifications on this device, the session remains active. Please retry.',
        },
        { status: 503 }
      );
    }

    // 4. Clear student session cookie ONLY after verified database subscription disassociation
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully.',
      subscriptionRevertedToAnonymous,
    });
    clearStudentCookie(response);
    return response;
  } catch (authErr: unknown) {
    const errMsg = authErr instanceof Error ? authErr.message : 'Unknown auth error';
    console.error('Logout: unexpected verification failure:', errMsg);
    return NextResponse.json(
      {
        success: false,
        error: 'LOGOUT_ERROR',
        message: 'An unexpected error occurred while processing logout. Please retry.',
      },
      { status: 500 }
    );
  }
}
