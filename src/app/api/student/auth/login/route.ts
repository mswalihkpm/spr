export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signStudentToken, setStudentCookie } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Student identifier (SPR ID, Student ID, or Name) and password are required.' },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim();

    // Look up student by SPR ID, studentId, or exact fullName
    const student = await prisma.student.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [
          { sprStudentId: { equals: cleanIdentifier, mode: 'insensitive' } },
          { studentId: { equals: cleanIdentifier, mode: 'insensitive' } },
          { fullName: { equals: cleanIdentifier, mode: 'insensitive' } },
        ],
      },
      include: {
        account: true,
        class: true,
      },
    });

    if (!student || !student.account) {
      return NextResponse.json(
        { error: 'No student account found with these credentials. Please check or create an account.' },
        { status: 401 }
      );
    }

    if (student.account.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: `Account is ${student.account.status.toLowerCase()}. Please contact the administrator.` },
        { status: 403 }
      );
    }

    // Check if entered password matches administrative activation code
    const isActivationCodeMatch =
      Boolean(student.account.activationCode) &&
      student.account.activationCode!.trim().toUpperCase() === password.trim().toUpperCase();

    let isValid = false;
    let mustChangePassword = student.account.mustChangePassword;

    if (isActivationCodeMatch) {
      isValid = true;
      mustChangePassword = true;
      // Auto-activate account and require new personal password setup
      await prisma.studentAccount.update({
        where: { id: student.account.id },
        data: {
          isActivated: true,
          mustChangePassword: true,
          activatedAt: student.account.activatedAt || new Date(),
          lastLoginAt: new Date(),
        },
      });
    } else {
      if (!student.account.isActivated) {
        return NextResponse.json(
          { error: 'Account has not been activated. Please enter your admin activation code as password or complete registration.' },
          { status: 403 }
        );
      }
      isValid = await verifyPassword(password, student.account.passwordHash);
      if (isValid) {
        await prisma.studentAccount.update({
          where: { id: student.account.id },
          data: { lastLoginAt: new Date() },
        });
      }
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password or activation code. Please try again.' }, { status: 401 });
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    await logAuditAction({
      userName: student.fullName,
      action: isActivationCodeMatch ? 'STUDENT_LOGIN_WITH_ACTIVATION_CODE' : 'STUDENT_LOGIN',
      entity: 'StudentAccount',
      entityId: student.account.id,
      ipAddress,
      userAgent,
    });

    const sessionPayload = {
      studentAccountId: student.account.id,
      studentId: student.id,
      sprStudentId: student.sprStudentId || '',
      fullName: student.fullName,
      className: student.class?.name || '',
      division: student.division,
      photoUrl: student.photoUrl,
      role: 'STUDENT' as const,
      mustChangePassword,
    };

    const token = signStudentToken(sessionPayload);
    const response = NextResponse.json({
      success: true,
      student: sessionPayload,
      mustChangePassword,
    });

    setStudentCookie(response, token);
    return response;
  } catch (error: any) {
    console.error('Student login error:', error);
    return NextResponse.json({ error: 'Authentication failed due to a server error.' }, { status: 500 });
  }
}
