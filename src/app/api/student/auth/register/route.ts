export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signStudentToken, setStudentCookie } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { getOrCreateStudentWallet } from '@/lib/student-earnings';

export async function POST(req: NextRequest) {
  try {
    const { studentId, password, confirmPassword, activationCode } = await req.json();

    if (!studentId) {
      return NextResponse.json({ error: 'Please select a student.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters in length.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match. Please re-enter.' }, { status: 400 });
    }

    if (!activationCode || typeof activationCode !== 'string' || !activationCode.trim()) {
      return NextResponse.json({
        error: 'Identity verification code is required. Please enter your authorized activation code or institutional ID.',
      }, { status: 400 });
    }

    const cleanCode = activationCode.trim().toUpperCase();

    // Run atomically to prevent race condition or duplicate account creation
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch student with relations
      const student = await tx.student.findUnique({
        where: { id: studentId },
        include: {
          account: true,
          class: true,
        },
      });

      if (!student) {
        throw new Error('Student record not found.');
      }

      // Check if student already has an activated account
      if (student.account && student.account.isActivated) {
        throw new Error('This student already has an active account. Please sign in instead.');
      }

      // Identity verification:
      // Check if account has an administrative activation code set, or compare with SPR ID or institutional ID
      let isCodeValid = false;

      if (student.account?.activationCode) {
        if (student.account.activationCode.trim().toUpperCase() === cleanCode) {
          isCodeValid = true;
        }
      }

      // Authorized fallback verification: SPR Student ID or institutional student ID (e.g. SPR0118 or MSOE-2026-xxx)
      if (!isCodeValid) {
        const sprMatch = student.sprStudentId && student.sprStudentId.trim().toUpperCase() === cleanCode;
        const codeMatch = student.studentId && student.studentId.trim().toUpperCase() === cleanCode;
        if (sprMatch || codeMatch) {
          isCodeValid = true;
        }
      }

      if (!isCodeValid) {
        throw new Error('Invalid activation or verification code. Contact your administrator if you do not have your activation code.');
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create or update StudentAccount
      const account = student.account
        ? await tx.studentAccount.update({
            where: { id: student.account.id },
            data: {
              passwordHash,
              isActivated: true,
              status: 'ACTIVE',
              activatedAt: new Date(),
              lastLoginAt: new Date(),
            },
          })
        : await tx.studentAccount.create({
            data: {
              studentId: student.id,
              passwordHash,
              isActivated: true,
              status: 'ACTIVE',
              activatedAt: new Date(),
              lastLoginAt: new Date(),
            },
          });

      // Initialize Wallet and Store Fund
      await getOrCreateStudentWallet(student.id, tx);

      return {
        account,
        student,
      };
    });

    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    await logAuditAction({
      userName: result.student.fullName,
      action: 'STUDENT_ACCOUNT_CREATE',
      entity: 'StudentAccount',
      entityId: result.account.id,
      newValue: {
        studentId: result.student.id,
        sprStudentId: result.student.sprStudentId,
        studentName: result.student.fullName,
      },
      ipAddress,
      userAgent,
    });

    const sessionPayload = {
      studentAccountId: result.account.id,
      studentId: result.student.id,
      sprStudentId: result.student.sprStudentId || '',
      fullName: result.student.fullName,
      className: result.student.class?.name || '',
      division: result.student.division,
      photoUrl: result.student.photoUrl,
      role: 'STUDENT' as const,
      mustChangePassword: false,
    };

    const token = signStudentToken(sessionPayload);
    const response = NextResponse.json({
      success: true,
      message: 'Student account created and activated successfully.',
      student: sessionPayload,
    });

    setStudentCookie(response, token);
    return response;
  } catch (error: any) {
    console.error('Student registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Account registration failed due to an unexpected error.' },
      { status: 400 }
    );
  }
}
