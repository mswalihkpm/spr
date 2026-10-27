export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest, hashPassword } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { syncStudentEarnings, getOrCreateStudentWallet } from '@/lib/student-earnings';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const students = await prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: {
        account: true,
        wallet: true,
        storeFund: true,
        class: { select: { id: true, name: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    const formatted = students.map((s) => {
      let status = 'NOT_CREATED';
      if (s.account) {
        if (!s.account.isActivated) {
          status = 'PENDING_ACTIVATION';
        } else {
          status = s.account.status; // ACTIVE, DISABLED, LOCKED
        }
      }

      return {
        id: s.id,
        fullName: s.fullName,
        studentId: s.studentId,
        sprStudentId: s.sprStudentId,
        className: s.class?.name || '',
        division: s.division,
        hasAccount: !!s.account,
        isActivated: s.account?.isActivated || false,
        accountStatus: status,
        activationCode: s.account?.activationCode || null,
        mustChangePassword: s.account?.mustChangePassword || false,
        createdAt: s.account?.createdAt ? s.account.createdAt.toISOString() : null,
        lastLoginAt: s.account?.lastLoginAt ? s.account.lastLoginAt.toISOString() : null,
        walletBalance: s.wallet ? Number(s.wallet.balance) : 0,
        totalEarnings: s.wallet ? Number(s.wallet.totalEarnings) : 0,
        availableStoreFund: s.storeFund ? Number(s.storeFund.availableFund) : 0,
      };
    });

    return NextResponse.json({ students: formatted });
  } catch (error: any) {
    console.error('Super Admin fetch student accounts error:', error);
    return NextResponse.json({ error: 'Failed to retrieve student accounts.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { action, studentId, newPassword, newStatus } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'Target student ID is required.' }, { status: 400 });
    }

    const targetStudent = await prisma.student.findUnique({
      where: { id: studentId },
      include: { account: true },
    });

    if (!targetStudent) {
      return NextResponse.json({ error: 'Target student record not found.' }, { status: 404 });
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // 1. GENERATE OR VIEW ACTIVATION CODE
    if (action === 'GENERATE_ACTIVATION_CODE') {
      const generatedCode = `AC-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      if (targetStudent.account) {
        await prisma.studentAccount.update({
          where: { id: targetStudent.account.id },
          data: { activationCode: generatedCode },
        });
      } else {
        const dummyHash = await hashPassword(crypto.randomBytes(16).toString('hex'));
        await prisma.studentAccount.create({
          data: {
            studentId: targetStudent.id,
            passwordHash: dummyHash,
            activationCode: generatedCode,
            isActivated: false,
            status: 'ACTIVE',
          },
        });
      }

      await logAuditAction({
        userId: user.id,
        userName: user.name,
        action: 'STUDENT_ACTIVATION_CODE_GENERATED',
        entity: 'StudentAccount',
        entityId: targetStudent.id,
        newValue: { targetStudentName: targetStudent.fullName, sprStudentId: targetStudent.sprStudentId },
        ipAddress,
        userAgent,
      });

      return NextResponse.json({
        success: true,
        activationCode: generatedCode,
        message: `Activation code generated for ${targetStudent.fullName}. Provide this code to the student for registration.`,
      });
    }

    // 2. SUPER ADMIN PASSWORD RESET
    if (action === 'RESET_PASSWORD') {
      // Must be SUPER_ADMIN or authorized admin
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Only Super Administrators can reset student credentials.' }, { status: 403 });
      }

      // Generate secure temporary password if none provided
      const tempPassword = newPassword && typeof newPassword === 'string' && newPassword.trim().length >= 6
        ? newPassword.trim()
        : `SPR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      const passwordHash = await hashPassword(tempPassword);

      if (targetStudent.account) {
        await prisma.studentAccount.update({
          where: { id: targetStudent.account.id },
          data: {
            passwordHash,
            mustChangePassword: true,
            status: 'ACTIVE',
            isActivated: true,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.studentAccount.create({
          data: {
            studentId: targetStudent.id,
            passwordHash,
            mustChangePassword: true,
            status: 'ACTIVE',
            isActivated: true,
          },
        });
        await getOrCreateStudentWallet(targetStudent.id);
      }

      // AUDIT LOG (NEVER log the password or secret!)
      await logAuditAction({
        userId: user.id,
        userName: user.name,
        action: 'SUPER_ADMIN_STUDENT_PASSWORD_RESET',
        entity: 'StudentAccount',
        entityId: targetStudent.id,
        newValue: {
          targetStudentName: targetStudent.fullName,
          sprStudentId: targetStudent.sprStudentId,
          mustChangePassword: true,
          resetStatus: 'SUCCESS',
        },
        ipAddress,
        userAgent,
      });

      return NextResponse.json({
        success: true,
        temporaryPassword: tempPassword,
        message: `Password reset successfully for ${targetStudent.fullName}. The temporary password is provided below. Student must change it upon login.`,
      });
    }

    // 3. UPDATE ACCOUNT STATUS (Disable / Reactivate)
    if (action === 'UPDATE_STATUS') {
      if (!newStatus || !['ACTIVE', 'DISABLED', 'LOCKED'].includes(newStatus)) {
        return NextResponse.json({ error: 'Valid status (ACTIVE, DISABLED, LOCKED) is required.' }, { status: 400 });
      }

      if (!targetStudent.account) {
        return NextResponse.json({ error: 'Student does not have an account to update.' }, { status: 400 });
      }

      await prisma.studentAccount.update({
        where: { id: targetStudent.account.id },
        data: { status: newStatus },
      });

      await logAuditAction({
        userId: user.id,
        userName: user.name,
        action: `STUDENT_ACCOUNT_${newStatus}`,
        entity: 'StudentAccount',
        entityId: targetStudent.id,
        newValue: { targetStudentName: targetStudent.fullName, newStatus },
        ipAddress,
        userAgent,
      });

      return NextResponse.json({
        success: true,
        message: `Student account status updated to ${newStatus}.`,
      });
    }

    // 4. RECALCULATE STUDENT EARNINGS
    if (action === 'RECALCULATE_EARNINGS') {
      const result = await syncStudentEarnings(targetStudent.id);
      return NextResponse.json({
        success: true,
        message: `Earnings reconciled successfully for ${targetStudent.fullName}.`,
        data: result,
      });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Super Admin student account action error:', error);
    return NextResponse.json(
      { error: error.message || 'Operation failed due to an error.' },
      { status: 500 }
    );
  }
}
