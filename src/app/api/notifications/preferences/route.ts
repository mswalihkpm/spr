export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateStudentRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_PREFERENCE_KEYS = new Set([
  'academicAlerts',
  'examAlerts',
  'taskAlerts',
  'announcements',
]);

interface PreferenceUpdatePayload {
  academicAlerts?: boolean;
  examAlerts?: boolean;
  taskAlerts?: boolean;
  announcements?: boolean;
}

/**
 * GET /api/notifications/preferences
 *
 * Retrieves the notification preferences for the authenticated student.
 * If no preference record exists yet, creates one populated with default values.
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

    // Retrieve or initialize default preferences for the authenticated student
    const preferences = await prisma.notificationPreference.upsert({
      where: { studentAccountId: student.studentAccountId },
      create: {
        studentAccountId: student.studentAccountId,
        academicAlerts: true,
        examAlerts: true,
        taskAlerts: true,
        announcements: true,
      },
      update: {},
      select: {
        academicAlerts: true,
        examAlerts: true,
        taskAlerts: true,
        announcements: true,
      },
    });

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error: unknown) {
    console.error('Fetch notification preferences error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching preferences.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/preferences
 *
 * Updates notification preferences for the authenticated student.
 *
 * Security & Validation Rules:
 * 1. Strict student authentication required: returns HTTP 401 if unauthenticated.
 * 2. Ownership derived strictly from the verified session (`student.studentAccountId`).
 * 3. Client cannot specify or alter ownership fields (`studentAccountId`, `studentId`, `userId`).
 * 4. Rejects any unknown preference keys with HTTP 400.
 * 5. Rejects non-boolean values with HTTP 400.
 * 6. Supports partial updates while preserving unspecified preference values.
 */
export async function PUT(req: NextRequest) {
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

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a valid JSON object.' },
        { status: 400 }
      );
    }

    const bodyKeys = Object.keys(body);
    if (bodyKeys.length === 0) {
      return NextResponse.json(
        { error: 'At least one preference field must be provided for update.' },
        { status: 400 }
      );
    }

    // Strict validation: reject any unknown fields (including ownership fields like studentAccountId)
    for (const key of bodyKeys) {
      if (!ALLOWED_PREFERENCE_KEYS.has(key)) {
        return NextResponse.json(
          { error: `Unknown preference field: '${key}'. Allowed fields are: academicAlerts, examAlerts, taskAlerts, announcements.` },
          { status: 400 }
        );
      }

      if (typeof body[key] !== 'boolean') {
        return NextResponse.json(
          { error: `Field '${key}' must be a boolean value (true or false).` },
          { status: 400 }
        );
      }
    }

    const payload = body as PreferenceUpdatePayload;

    // Perform partial update while preserving existing values; initialize defaults if record is missing
    const updated = await prisma.notificationPreference.upsert({
      where: { studentAccountId: student.studentAccountId },
      create: {
        studentAccountId: student.studentAccountId,
        academicAlerts: payload.academicAlerts !== undefined ? payload.academicAlerts : true,
        examAlerts: payload.examAlerts !== undefined ? payload.examAlerts : true,
        taskAlerts: payload.taskAlerts !== undefined ? payload.taskAlerts : true,
        announcements: payload.announcements !== undefined ? payload.announcements : true,
      },
      update: {
        ...(payload.academicAlerts !== undefined && { academicAlerts: payload.academicAlerts }),
        ...(payload.examAlerts !== undefined && { examAlerts: payload.examAlerts }),
        ...(payload.taskAlerts !== undefined && { taskAlerts: payload.taskAlerts }),
        ...(payload.announcements !== undefined && { announcements: payload.announcements }),
      },
      select: {
        academicAlerts: true,
        examAlerts: true,
        taskAlerts: true,
        announcements: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully.',
      preferences: updated,
    });
  } catch (error: unknown) {
    console.error('Update notification preferences error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating preferences.' },
      { status: 500 }
    );
  }
}
