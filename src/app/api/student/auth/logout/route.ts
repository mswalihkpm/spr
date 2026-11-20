export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { clearStudentCookie, authenticateStudentRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/student/auth/logout
 *
 * Logs out the authenticated student and deactivates any active push subscription
 * token associated with this specific student on this device.
 *
 * Security & Ownership Rules (Stage 9):
 * 1. Authenticates student session before clearing the session cookie.
 * 2. If an fcmToken is supplied, deactivates ONLY if BOTH fcmToken AND studentAccountId match.
 *    - Prevents Student A from deactivating Student B's subscription if the token was already reassigned.
 *    - Never alters or deactivates staff subscriptions (userId !== null).
 * 3. Preserves PostgreSQL ownership CHECK constraint: leaves studentAccountId intact and sets isActive: false.
 * 4. Resilient to failures: always clears the student session cookie and returns HTTP 200, ensuring
 *    students are never trapped in a broken state if the database or network experiences issues.
 * 5. Accurately reports subscriptionDeactivated boolean so client can inspect result without false claims.
 */
export async function POST(req: NextRequest) {
  let subscriptionDeactivated = false;

  try {
    // 1. Authenticate the student session before clearing cookie
    const { student } = await authenticateStudentRequest(req);

    if (student?.studentAccountId) {
      // 2. Parse optional fcmToken from JSON body
      try {
        const body = await req.json().catch(() => null);
        const fcmToken = body?.fcmToken;

        if (fcmToken && typeof fcmToken === 'string' && fcmToken.trim()) {
          const cleanToken = fcmToken.trim();

          // Deactivate ONLY if fcmToken matches AND studentAccountId matches the authenticated student!
          const result = await prisma.pushSubscription.updateMany({
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

          subscriptionDeactivated = result.count > 0;
        }
      } catch (parseErr) {
        // Non-JSON or missing body is permitted for standard logouts
        console.warn('Logout: optional body parsing skipped:', parseErr);
      }
    }
  } catch (authErr) {
    console.error('Logout error during subscription check:', authErr);
  }

  // 3. Always clear student session cookie
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully.',
    subscriptionDeactivated,
  });
  clearStudentCookie(response);
  return response;
}
