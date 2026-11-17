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

    // Base filter: All wallet transactions from history
    const where: Prisma.WalletTransactionWhereInput = {};

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
      } else if (type === 'CREDIT') {
        where.amount = { gt: 0 };
        where.NOT = { type: { in: ['TRANSFER_SENT', 'STORE_CONTRIBUTION'] } };
      } else if (type === 'DEBIT') {
        where.OR = [
          { type: { in: ['TRANSFER_SENT', 'STORE_CONTRIBUTION'] } },
          { amount: { lt: 0 } },
        ];
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

    // Fetch total count and paginated records
    const [total, transactions] = await Promise.all([
      prisma.walletTransaction.count({ where }),
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
                  totalTransferred: true,
                  totalReceived: true,
                  totalContributedToStore: true,
                },
              },
            },
          },
          senderStudent: {
            select: {
              id: true,
              fullName: true,
              sprStudentId: true,
            },
          },
          recipientStudent: {
            select: {
              id: true,
              fullName: true,
              sprStudentId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formattedTransactions = transactions.map((tx) => {
      const amt = Number(tx.amount);
      const isDebit =
        tx.type === 'TRANSFER_SENT' ||
        tx.type === 'STORE_CONTRIBUTION' ||
        amt < 0;

      return {
        id: tx.id,
        reference: tx.reference,
        studentId: tx.studentId,
        type: tx.type,
        amount: Math.abs(amt),
        rawAmount: amt,
        isDebit,
        balanceBefore: Number(tx.balanceBefore),
        balanceAfter: Number(tx.balanceAfter),
        description: tx.description,
        status: tx.status,
        createdAt: tx.createdAt.toISOString(),
        sender: tx.senderStudent,
        recipient: tx.recipientStudent,
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
      };
    });

    return NextResponse.json({
      transactions: formattedTransactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
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
      // 1. Fetch matching transactions with student, wallet, and storeFund
      const transactions = await tx.walletTransaction.findMany({
        where: { id: { in: transactionIds } },
        include: {
          student: {
            include: {
              wallet: true,
              storeFund: true,
            },
          },
        },
      });

      if (transactions.length === 0) {
        throw new Error('No matching transactions found to delete.');
      }

      // 2. Group by student and calculate adjustments
      const studentMap = new Map<
        string,
        {
          student: any;
          balanceDelta: number;
          earningsDelta: number;
          storeDelta: number;
          transferredDelta: number;
          receivedDelta: number;
          references: string[];
          txnIds: string[];
        }
      >();

      for (const t of transactions) {
        const sId = t.studentId;
        if (!studentMap.has(sId)) {
          studentMap.set(sId, {
            student: t.student,
            balanceDelta: 0,
            earningsDelta: 0,
            storeDelta: 0,
            transferredDelta: 0,
            receivedDelta: 0,
            references: [],
            txnIds: [],
          });
        }

        const entry = studentMap.get(sId)!;
        const amt = Number(t.amount);

        if (t.type === 'EARNING') {
          // Earning credit is deleted: deduct from balance and earnings
          entry.balanceDelta -= amt;
          entry.earningsDelta -= amt;
        } else if (t.type === 'ADJUSTMENT') {
          if (amt >= 0) {
            entry.balanceDelta -= amt;
            entry.earningsDelta -= amt;
          } else {
            // Negative adjustment deleted: refund balance
            entry.balanceDelta += Math.abs(amt);
          }
        } else if (t.type === 'TRANSFER_RECEIVED') {
          // Transfer received deleted: deduct from balance and totalReceived
          entry.balanceDelta -= amt;
          entry.receivedDelta -= amt;
        } else if (t.type === 'TRANSFER_SENT') {
          // Transfer sent deleted: refund to sender balance and deduct totalTransferred
          entry.balanceDelta += amt;
          entry.transferredDelta -= amt;
        } else if (t.type === 'STORE_CONTRIBUTION') {
          // Store contribution deleted: refund to wallet balance, deduct from store
          entry.balanceDelta += amt;
          entry.storeDelta -= amt;
        } else {
          // Default: if positive, deduct; if negative, refund
          entry.balanceDelta -= amt;
        }

        entry.references.push(t.reference);
        entry.txnIds.push(t.id);
      }

      let grandTotalImpact = 0;

      // 3. Update each affected student's wallet & store funds
      const entries = Array.from(studentMap.entries());
      for (let i = 0; i < entries.length; i++) {
        const [studentId, data] = entries[i];
        const student = data.student;
        const currentBalance = student?.wallet ? Number(student.wallet.balance) : 0;
        const currentEarnings = student?.wallet ? Number(student.wallet.totalEarnings) : 0;
        const currentTransferred = student?.wallet ? Number(student.wallet.totalTransferred) : 0;
        const currentReceived = student?.wallet ? Number(student.wallet.totalReceived) : 0;
        const currentContributed = student?.wallet ? Number(student.wallet.totalContributedToStore) : 0;

        const newBalance = Math.max(0, Number((currentBalance + data.balanceDelta).toFixed(2)));
        const newEarnings = Math.max(0, Number((currentEarnings + data.earningsDelta).toFixed(2)));
        const newTransferred = Math.max(0, Number((currentTransferred + data.transferredDelta).toFixed(2)));
        const newReceived = Math.max(0, Number((currentReceived + data.receivedDelta).toFixed(2)));
        const newContributed = Math.max(0, Number((currentContributed + data.storeDelta).toFixed(2)));

        grandTotalImpact = Number((grandTotalImpact + Math.abs(data.balanceDelta)).toFixed(2));

        await tx.studentWallet.upsert({
          where: { studentId },
          create: {
            studentId,
            balance: new Decimal(newBalance.toFixed(2)),
            totalEarnings: new Decimal(newEarnings.toFixed(2)),
            totalTransferred: new Decimal(newTransferred.toFixed(2)),
            totalReceived: new Decimal(newReceived.toFixed(2)),
            totalContributedToStore: new Decimal(newContributed.toFixed(2)),
          },
          update: {
            balance: new Decimal(newBalance.toFixed(2)),
            totalEarnings: new Decimal(newEarnings.toFixed(2)),
            totalTransferred: new Decimal(newTransferred.toFixed(2)),
            totalReceived: new Decimal(newReceived.toFixed(2)),
            totalContributedToStore: new Decimal(newContributed.toFixed(2)),
          },
        });

        // 3a. Update StoreFundRecord if store contributions were reversed
        if (data.storeDelta !== 0 && student?.storeFund) {
          const currentAvail = Number(student.storeFund.availableFund || 0);
          const currentStoreTot = Number(student.storeFund.totalContributed || 0);
          const newAvail = Math.max(0, Number((currentAvail + data.storeDelta).toFixed(2)));
          const newStoreTot = Math.max(0, Number((currentStoreTot + data.storeDelta).toFixed(2)));

          await tx.storeFundRecord.update({
            where: { studentId },
            data: {
              availableFund: new Decimal(newAvail.toFixed(2)),
              totalContributed: new Decimal(newStoreTot.toFixed(2)),
            },
          });
        }

        // 3b. Clean up matching EarningLedgers if reference matches
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

        // 3c. Clean up matching TaskRewardLedgers if reference starts with TXN-TASK
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
        totalImpactAmount: grandTotalImpact,
        affectedStudentsCount: studentMap.size,
      };
    });

    // Invalidate caches so SPR engine and Fund Analytics reflect adjustments immediately
    invalidateEngineCache();

    // Log administrative audit action
    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: 'ADMIN_DELETE_TRANSACTIONS',
      entity: 'WalletTransaction',
      details: {
        deletedCount: result.deletedCount,
        totalImpactAmount: result.totalImpactAmount,
        affectedStudentsCount: result.affectedStudentsCount,
        transactionIds,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      totalImpactAmount: result.totalImpactAmount,
      affectedStudentsCount: result.affectedStudentsCount,
      message: `Successfully deleted ${result.deletedCount} transaction(s) and synchronized student wallet ledgers.`,
    });
  } catch (error: any) {
    console.error('Error deleting transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete transactions.' },
      { status: 500 }
    );
  }
}
