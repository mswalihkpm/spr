import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { Decimal } from '@prisma/client/runtime/library';
import { invalidateEngineCache } from '@/lib/spr-engine';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('q')?.trim() || '';
    const classId = searchParams.get('classId')?.trim() || 'ALL';
    const type = searchParams.get('type')?.trim() || 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    // Base filter: Only credited transactions (amount > 0 and not debits)
    const where: Prisma.WalletTransactionWhereInput = {
      amount: { gt: 0 },
      NOT: {
        type: { in: ['TRANSFER_SENT', 'STORE_CONTRIBUTION'] },
      },
    };

    // Class filter
    if (classId && classId !== 'ALL') {
      where.student = {
        classId: classId,
      };
    }

    // Type filter
    if (type && type !== 'ALL') {
      if (type === 'TASK') {
        where.reference = { startsWith: 'TXN-TASK' };
      } else {
        where.type = type;
      }
    }

    // Advanced search filter (Transaction name/description, reference, student name, SPR ID)
    if (search) {
      where.AND = [
        {
          OR: [
            { description: { contains: search, mode: 'insensitive' } },
            { reference: { contains: search, mode: 'insensitive' } },
            {
              student: {
                fullName: { contains: search, mode: 'insensitive' },
              },
            },
            {
              student: {
                sprStudentId: { contains: search, mode: 'insensitive' },
              },
            },
            {
              student: {
                studentId: { contains: search, mode: 'insensitive' },
              },
            },
          ],
        },
      ];
    }

    // Fetch total count, sum of credited amounts, and paginated records
    const [total, aggregate, transactions] = await Promise.all([
      prisma.walletTransaction.count({ where }),
      prisma.walletTransaction.aggregate({
        where,
        _sum: { amount: true },
      }),
      prisma.walletTransaction.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              sprStudentId: true,
              studentId: true,
              photoUrl: true,
              division: true,
              class: {
                select: { id: true, name: true, numericGrade: true },
              },
              wallet: {
                select: {
                  balance: true,
                  totalEarnings: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formattedTransactions = transactions.map((tx) => ({
      id: tx.id,
      reference: tx.reference,
      studentId: tx.studentId,
      type: tx.type,
      amount: Number(tx.amount),
      balanceBefore: Number(tx.balanceBefore),
      balanceAfter: Number(tx.balanceAfter),
      description: tx.description,
      status: tx.status,
      createdAt: tx.createdAt.toISOString(),
      student: tx.student
        ? {
            id: tx.student.id,
            fullName: tx.student.fullName,
            sprStudentId: tx.student.sprStudentId,
            studentId: tx.student.studentId,
            photoUrl: tx.student.photoUrl,
            division: tx.student.division,
            className: tx.student.class?.name || 'Unassigned',
            classId: tx.student.class?.id || null,
            walletBalance: tx.student.wallet ? Number(tx.student.wallet.balance) : 0,
            totalEarnings: tx.student.wallet ? Number(tx.student.wallet.totalEarnings) : 0,
          }
        : null,
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
      total,
      totalCreditedAmount: Number(aggregate._sum.amount || 0),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Error fetching credited transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve transactions.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    let transactionIds: string[] = [];

    if (Array.isArray(body.transactionIds)) {
      transactionIds = body.transactionIds.filter(
        (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0
      );
    } else if (typeof body.transactionId === 'string' && body.transactionId.trim().length > 0) {
      transactionIds = [body.transactionId.trim()];
    }

    if (transactionIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid transactionId or transactionIds array is required.' },
        { status: 400 }
      );
    }

    // Execute atomic deletion and wallet balance + total earnings adjustment
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch matching transactions with student and wallet
      const transactions = await tx.walletTransaction.findMany({
        where: { id: { in: transactionIds } },
        include: {
          student: {
            include: {
              wallet: true,
            },
          },
        },
      });

      if (transactions.length === 0) {
        throw new Error('No matching transactions found to delete.');
      }

      // 2. Group by student and calculate total positive amount to deduct
      const studentMap = new Map<
        string,
        {
          student: any;
          totalDeduct: number;
          references: string[];
          txnIds: string[];
        }
      >();

      for (const t of transactions) {
        const sId = t.studentId;
        if (!studentMap.has(sId)) {
          studentMap.set(sId, {
            student: t.student,
            totalDeduct: 0,
            references: [],
            txnIds: [],
          });
        }

        const entry = studentMap.get(sId)!;
        const amt = Number(t.amount);
        // Deduct credited amount (only positive credited amounts)
        if (amt > 0) {
          entry.totalDeduct = Number((entry.totalDeduct + amt).toFixed(2));
        }
        entry.references.push(t.reference);
        entry.txnIds.push(t.id);
      }

      let grandTotalDeducted = 0;

      // 3. Update each affected student's wallet balance & lifetime earnings
      const entries = Array.from(studentMap.entries());
      for (let i = 0; i < entries.length; i++) {
        const [studentId, data] = entries[i];
        const student = data.student;
        const currentBalance = student?.wallet ? Number(student.wallet.balance) : 0;
        const currentEarnings = student?.wallet ? Number(student.wallet.totalEarnings) : 0;

        const deduct = data.totalDeduct;
        grandTotalDeducted = Number((grandTotalDeducted + deduct).toFixed(2));

        const newBalance = Math.max(0, Number((currentBalance - deduct).toFixed(2)));
        const newEarnings = Math.max(0, Number((currentEarnings - deduct).toFixed(2)));

        await tx.studentWallet.upsert({
          where: { studentId },
          create: {
            studentId,
            balance: new Decimal(newBalance.toFixed(2)),
            totalEarnings: new Decimal(newEarnings.toFixed(2)),
          },
          update: {
            balance: new Decimal(newBalance.toFixed(2)),
            totalEarnings: new Decimal(newEarnings.toFixed(2)),
          },
        });

        // 3a. Clean up matching EarningLedgers if reference matches
        const ledgerRefs = data.references
          .map((r: string) => r.replace(/^TXN-/, ''))
          .filter(Boolean);
        if (ledgerRefs.length > 0) {
          await tx.earningLedger.deleteMany({
            where: {
              studentId,
              reference: { in: ledgerRefs },
            },
          });
        }

        // 3b. Clean up matching TaskRewardLedgers if reference starts with TXN-TASK
        const taskRefs = data.references.filter((r: string) => r.startsWith('TXN-TASK'));
        if (taskRefs.length > 0) {
          await tx.taskRewardLedger.deleteMany({
            where: {
              studentId,
              transactionReference: { in: taskRefs },
            },
          });
        }
      }

      // 4. Delete the WalletTransaction records
      const deleteResult = await tx.walletTransaction.deleteMany({
        where: { id: { in: transactions.map((t) => t.id) } },
      });

      return {
        deletedCount: deleteResult.count,
        totalDeductedAmount: grandTotalDeducted,
        affectedStudentsCount: studentMap.size,
      };
    });

    // Invalidate caches so SPR engine and Fund Analytics reflect the deduction immediately
    invalidateEngineCache();

    // Log administrative audit action
    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: 'ADMIN_DELETE_CREDITED_TRANSACTIONS',
      entity: 'WalletTransaction',
      details: {
        deletedCount: result.deletedCount,
        totalDeductedAmount: result.totalDeductedAmount,
        affectedStudentsCount: result.affectedStudentsCount,
        transactionIds,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      totalDeductedAmount: result.totalDeductedAmount,
      affectedStudentsCount: result.affectedStudentsCount,
      message: `Successfully deleted ${result.deletedCount} transaction(s). ₹${result.totalDeductedAmount.toFixed(2)} deducted from wallets and lifetime earnings.`,
    });
  } catch (error: any) {
    console.error('Error deleting credited transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete transactions.' },
      { status: 500 }
    );
  }
}
