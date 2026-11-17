import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { Decimal } from '@prisma/client/runtime/library';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { studentId, action, amount, note } = body;

    if (!studentId || !action || amount === undefined || isNaN(Number(amount))) {
      return NextResponse.json(
        { error: 'Student ID, action (ADD, REDUCE, or SET), and a valid amount are required.' },
        { status: 400 }
      );
    }

    const numAmount = Math.abs(Number(amount));
    if (numAmount < 0) {
      return NextResponse.json({ error: 'Amount cannot be negative.' }, { status: 400 });
    }

    // Find student and wallet
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { wallet: true, class: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    let currentBalance = student.wallet ? Number(student.wallet.balance) : 0;
    let newBalance = currentBalance;

    if (action === 'ADD') {
      newBalance = currentBalance + numAmount;
    } else if (action === 'REDUCE') {
      newBalance = Math.max(0, currentBalance - numAmount);
    } else if (action === 'SET') {
      newBalance = Math.max(0, numAmount);
    } else {
      return NextResponse.json({ error: 'Invalid action. Choose ADD, REDUCE, or SET.' }, { status: 400 });
    }

    // Direct wallet balance update without creating any WalletTransaction
    const updatedWallet = await prisma.studentWallet.upsert({
      where: { studentId: student.id },
      create: {
        studentId: student.id,
        balance: new Decimal(newBalance.toFixed(2)),
        totalEarnings: new Decimal(newBalance.toFixed(2)),
      },
      update: {
        balance: new Decimal(newBalance.toFixed(2)),
      },
    });

    // Record internal administrator audit log (visible only in Admin Audit Logs, not Student Transaction History)
    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: `ADMIN_WALLET_${action}`,
      entity: 'StudentWallet',
      entityId: updatedWallet.id,
      details: {
        studentId: student.id,
        sprStudentId: student.sprStudentId,
        studentName: student.fullName,
        action,
        amount: numAmount,
        previousBalance: currentBalance,
        newBalance: Number(updatedWallet.balance),
        adminNote: note || 'Administrative balance adjustment',
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: `Wallet cash successfully ${action === 'ADD' ? 'added to' : action === 'REDUCE' ? 'reduced from' : 'updated for'} ${student.fullName}.`,
      wallet: {
        balance: Number(updatedWallet.balance),
        previousBalance: currentBalance,
      },
      student: {
        id: student.id,
        fullName: student.fullName,
        sprStudentId: student.sprStudentId,
      },
    });
  } catch (error: any) {
    console.error('Admin wallet adjustment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to adjust student wallet balance.' },
      { status: 500 }
    );
  }
}
