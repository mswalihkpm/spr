export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest, hashPassword } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'SUPER_ADMIN');
    if (errorResponse) return errorResponse;

    const [settings, users] = await Promise.all([
      prisma.systemSetting.findMany(),
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          mustChangePassword: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json({ settings: settingsMap, users });
  } catch (error: any) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'SUPER_ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { action, settings, userData, userId, newRole, newStatus } = body;

    if (action === 'SAVE_SETTINGS') {
      if (settings && typeof settings === 'object') {
        for (const [key, value] of Object.entries(settings)) {
          await prisma.systemSetting.upsert({
            where: { key },
            update: { value: String(value) },
            create: { key, value: String(value) },
          });
        }
      }

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'UPDATE',
        entity: 'SystemSetting',
        newValue: settings,
      });

      return NextResponse.json({ success: true, message: 'Settings saved successfully.' });
    }

    if (action === 'CREATE_USER') {
      const { email, name, password, role } = userData;
      if (!email || !password || !name) {
        return NextResponse.json({ error: 'Email, name, and password are required.' }, { status: 400 });
      }

      const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (existing) {
        return NextResponse.json({ error: 'User with this email already exists.' }, { status: 400 });
      }

      const passwordHash = await hashPassword(password);
      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          name: name.trim(),
          passwordHash,
          role: role || 'ADMIN',
          mustChangePassword: true,
          status: 'ACTIVE',
        },
      });

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'CREATE',
        entity: 'User',
        entityId: newUser.id,
        newValue: { email: newUser.email, name: newUser.name, role: newUser.role },
      });

      return NextResponse.json({
        success: true,
        message: 'User created successfully.',
        user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
      });
    }

    if (action === 'UPDATE_USER_ROLE') {
      if (!userId || !newRole) {
        return NextResponse.json({ error: 'User ID and Role are required.' }, { status: 400 });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role: newRole },
      });

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'UPDATE',
        entity: 'User',
        entityId: userId,
        newValue: { role: newRole },
      });

      return NextResponse.json({ success: true, message: 'User role updated.' });
    }

    if (action === 'UPDATE_USER_STATUS') {
      if (!userId || !newStatus) {
        return NextResponse.json({ error: 'User ID and Status are required.' }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { status: newStatus },
      });

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'UPDATE',
        entity: 'User',
        entityId: userId,
        newValue: { status: newStatus },
      });

      return NextResponse.json({ success: true, message: `User status changed to ${newStatus}.` });
    }

    if (action === 'ADMIN_RESET_PASSWORD') {
      const { newPassword: targetNewPassword, forceChange } = body;
      if (!userId || !targetNewPassword) {
        return NextResponse.json({ error: 'User ID and new password are required.' }, { status: 400 });
      }

      if (targetNewPassword.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
      }

      const newHash = await hashPassword(targetNewPassword);
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newHash,
          mustChangePassword: forceChange ?? true,
        },
      });

      // Clear all sessions for security
      await prisma.session.deleteMany({ where: { userId } });

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'UPDATE',
        entity: 'User',
        entityId: userId,
        newValue: { action: 'ADMIN_FORCE_PASSWORD_RESET' },
      });

      return NextResponse.json({ success: true, message: 'Password updated successfully.' });
    }

    if (action === 'DELETE_USER') {
      if (!userId) {
        return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
      }

      // Prevent self-deletion
      if (userId === user?.id) {
        return NextResponse.json({ error: 'You cannot delete your own logged-in administrator account.' }, { status: 400 });
      }

      const targetUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!targetUser) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      }

      // Delete sessions, tokens, audit logs
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.passwordResetToken.deleteMany({ where: { userId } });
      await prisma.auditLog.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'DELETE',
        entity: 'User',
        entityId: userId,
        previousValue: { email: targetUser.email, name: targetUser.name, role: targetUser.role },
      });

      return NextResponse.json({ success: true, message: `User "${targetUser.name}" deleted successfully.` });
    }

    if (action === 'BULK_DELETE_USERS') {
      const { userIds } = body;
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return NextResponse.json({ error: 'No user IDs provided for deletion.' }, { status: 400 });
      }

      // Filter out self-deletion
      const safeUserIds = userIds.filter((id: string) => id !== user?.id);
      if (safeUserIds.length === 0) {
        return NextResponse.json({ error: 'Cannot delete your own logged-in administrator account.' }, { status: 400 });
      }

      await prisma.session.deleteMany({ where: { userId: { in: safeUserIds } } });
      await prisma.passwordResetToken.deleteMany({ where: { userId: { in: safeUserIds } } });
      await prisma.auditLog.deleteMany({ where: { userId: { in: safeUserIds } } });
      const deleteResult = await prisma.user.deleteMany({ where: { id: { in: safeUserIds } } });

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'DELETE',
        entity: 'User',
        newValue: { action: 'BULK_DELETE_USERS', count: deleteResult.count, userIds: safeUserIds },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${deleteResult.count} user account(s).`,
        count: deleteResult.count,
      });
    }

    return NextResponse.json({ error: 'Invalid settings action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update settings.' }, { status: 500 });
  }
}

