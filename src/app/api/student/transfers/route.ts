export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateStudentRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { transferStudentToStudent, contributeToStoreFund } from '@/lib/student-transactions';

export async function GET(req: NextRequest) {
  try {
    const { student, errorResponse } = await authenticateStudentRequest(req);
    if (errorResponse) return errorResponse;
    if (!student) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const transactions = await prisma.walletTransaction.findMany({
      where: { studentId: student.studentId },
      include: {
        senderStudent: { select: { fullName: true, sprStudentId: true } },
        recipientStudent: { select: { fullName: true, sprStudentId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const formatted = transactions.map((t) => ({
      id: t.id,
      reference: t.reference,
      type: t.type,
      amount: Number(t.amount),
      balanceBefore: Number(t.balanceBefore),
      balanceAfter: Number(t.balanceAfter),
      description: t.description,
      status: t.status,
      senderName: t.senderStudent?.fullName,
      recipientName: t.recipientStudent?.fullName,
      createdAt: t.createdAt.toISOString(),
    }));

    return NextResponse.json({ transactions: formatted });
  } catch (error: any) {
    console.error('Fetch transactions error:', error);
    return NextResponse.json({ error: 'Failed to load transaction history.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { student, errorResponse } = await authenticateStudentRequest(req);
    if (errorResponse) return errorResponse;
    if (!student) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { action, recipientStudentId, amount, remarks } = body;

    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    if (action === 'TRANSFER_STUDENT') {
      const res = await transferStudentToStudent({
        senderStudentId: student.studentId,
        recipientStudentId,
        amount: Number(amount),
        remarks,
        ipAddress,
        userAgent,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully transferred ₹${res.amount.toFixed(2)} to ${res.recipientName}.`,
        data: res,
      });
    } else if (action === 'SHARE_STORE') {
      const res = await contributeToStoreFund({
        studentId: student.studentId,
        amount: Number(amount),
        remarks,
        ipAddress,
        userAgent,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully contributed ₹${res.amount.toFixed(2)} to School Store Fund.`,
        data: res,
      });
    } else {
      return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Transfer execution error:', error);
    return NextResponse.json(
      { error: error.message || 'Transaction could not be completed.' },
      { status: 400 }
    );
  }
}
