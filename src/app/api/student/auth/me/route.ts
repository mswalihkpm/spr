export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateStudentRequest } from '@/lib/auth';
import { syncStudentEarnings } from '@/lib/student-earnings';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { student, errorResponse } = await authenticateStudentRequest(req);
    if (errorResponse) return errorResponse;
    if (!student) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Idempotently reconcile earnings and obtain wallet + store fund summaries
    const earningsData = await syncStudentEarnings(student.studentId);

    // Fetch recent transactions for this student
    const recentTransactions = await prisma.walletTransaction.findMany({
      where: { studentId: student.studentId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const formattedTransactions = recentTransactions.map((t) => ({
      id: t.id,
      reference: t.reference,
      type: t.type,
      amount: Number(t.amount),
      balanceBefore: Number(t.balanceBefore),
      balanceAfter: Number(t.balanceAfter),
      description: t.description,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    }));

    return NextResponse.json({
      student,
      wallet: earningsData.wallet,
      categoryEarnings: earningsData.categoryEarnings,
      storeFund: earningsData.storeFund,
      recentTransactions: formattedTransactions,
    });
  } catch (error: any) {
    console.error('Student me error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load student dashboard data.' },
      { status: 500 }
    );
  }
}
