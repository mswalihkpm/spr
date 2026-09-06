export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, hashPassword, authenticateApiRequest, signToken, setAuthCookie } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req);
    if (errorResponse || !user) {
      return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword, confirmPassword } = await req.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'New password and confirmation do not match.' }, { status: 400 });
    }

    // Verify current user from database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // If currentPassword is provided, check it
    if (currentPassword) {
      const isMatch = await verifyPassword(currentPassword, dbUser.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
      }
    }

    // Hash new password
    const newHash = await hashPassword(newPassword);

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: 'PASSWORD_CHANGE',
      entity: 'User',
      entityId: user.id,
      newValue: { changed: true, mustChangePassword: false },
    });

    const updatedSession = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role as any,
      mustChangePassword: false,
    };

    const token = signToken(updatedSession);
    const response = NextResponse.json({
      success: true,
      message: 'Password changed successfully! You now have full access.',
      user: updatedSession,
    });

    setAuthCookie(response, token);
    return response;
  } catch (error: any) {
    console.error('Password change error:', error);
    return NextResponse.json({ error: 'Failed to update password.' }, { status: 500 });
  }
}
