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

    const [transactions, approvedTasks, wallet] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { studentId: student.studentId },
        include: {
          senderStudent: { select: { fullName: true, sprStudentId: true } },
          recipientStudent: { select: { fullName: true, sprStudentId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.studentTaskRecord.findMany({
        where: { studentId: student.studentId, status: 'APPROVED' },
        include: { task: true },
      }),
      prisma.studentWallet.findUnique({
        where: { studentId: student.studentId },
      }),
    ]);

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

    // Guarantee that approved rewarded tasks always appear in transaction history
    if (approvedTasks) {
      const currentBal = wallet ? Number(wallet.balance) : 0;
      for (const t of approvedTasks) {
        if (Number(t.awardedAmount) > 0) {
          const taskIdRef = t.task?.taskId || '';
          const alreadyExists = formatted.some(
            (tx) => (taskIdRef && tx.reference.includes(taskIdRef)) || (tx.description && tx.description.includes(t.task?.title || ''))
          );
          if (!alreadyExists) {
            const amt = Number(t.awardedAmount);
            formatted.push({
              id: `task-tx-${t.id}`,
              reference: `TXN-TASK-${taskIdRef}-${student.studentId.slice(-6)}`,
              type: 'EARNING',
              amount: amt,
              balanceBefore: Math.max(0, currentBal - amt),
              balanceAfter: currentBal,
              description: `Earned ₹${amt.toFixed(2)} from task "${t.task.title}" (${t.approvedPercentage || 100}% approved)`,
              status: 'COMPLETED',
              senderName: undefined,
              recipientName: undefined,
              createdAt: (t.approvedAt || t.createdAt).toISOString(),
            });
          }
        }
      }
      formatted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return NextResponse.json(
      { transactions: formatted },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );
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
    const action =
      body.action ||
      (body.type === 'STUDENT' ? 'TRANSFER_STUDENT' : body.type === 'STORE' ? 'SHARE_STORE' : body.type);
    const recipientStudentId = body.recipientStudentId || body.recipientId;
    const amount = Number(body.amount);
    const remarks = body.remarks;

    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    if (action === 'TRANSFER_STUDENT' || action === 'STUDENT') {
      const res = await transferStudentToStudent({
        senderStudentId: student.studentId,
        recipientStudentId,
        amount,
        remarks,
        ipAddress,
        userAgent,
      });

      return NextResponse.json({
        success: true,
        reference: res.reference,
        message: `Successfully transferred ₹${res.amount.toFixed(2)} to ${res.recipientName}.`,
        data: res,
      });
    } else if (action === 'SHARE_STORE' || action === 'STORE') {
      const res = await contributeToStoreFund({
        studentId: student.studentId,
        amount,
        remarks,
        ipAddress,
        userAgent,
      });

      return NextResponse.json({
        success: true,
        reference: res.reference,
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
