export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateStudentRequest, hashPassword, verifyPassword } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { student, errorResponse } = await authenticateStudentRequest(req);
    if (errorResponse) return errorResponse;
    if (!student) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { currentPassword, newPassword, confirmPassword } = await req.json();

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters in length.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'New passwords do not match.' }, { status: 400 });
    }

    const account = await prisma.studentAccount.findUnique({
      where: { id: student.studentAccountId },
    });

    if (!account) {
      return NextResponse.json({ error: 'Student account not found.' }, { status: 404 });
    }

    // If account doesn't require immediate change, verify current password
    if (!account.mustChangePassword && currentPassword) {
      const isValid = await verifyPassword(currentPassword, account.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: 'Incorrect current password.' }, { status: 400 });
      }
    }

    const newHash = await hashPassword(newPassword);

    await prisma.studentAccount.update({
      where: { id: account.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        updatedAt: new Date(),
      },
    });

    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    await logAuditAction({
      userName: student.fullName,
      action: 'STUDENT_PASSWORD_CHANGE',
      entity: 'StudentAccount',
      entityId: account.id,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, message: 'Password changed successfully.' });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Failed to update password.' }, { status: 500 });
  }
}
