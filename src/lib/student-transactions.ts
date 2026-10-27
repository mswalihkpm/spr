import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { logAuditAction } from './audit';
import { getOrCreateStudentWallet } from './student-earnings';

/**
 * Transfers funds from one student to another atomically.
 */
export async function transferStudentToStudent(params: {
  senderStudentId: string;
  recipientStudentId: string;
  amount: number;
  remarks?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const { senderStudentId, recipientStudentId, amount, remarks, ipAddress, userAgent } = params;

  if (!senderStudentId || !recipientStudentId) {
    throw new Error('Both sender and recipient student must be specified.');
  }

  if (senderStudentId === recipientStudentId) {
    throw new Error('Cannot transfer funds to yourself.');
  }

  if (isNaN(amount) || amount <= 0) {
    throw new Error('Transfer amount must be greater than zero.');
  }

  // Exact 2-decimal rounded amount
  const transferAmount = Math.round((amount + Number.EPSILON) * 100) / 100;
  const amountDecimal = new Prisma.Decimal(transferAmount);

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Fetch sender and recipient in parallel
      const [senderStudent, recipientStudent] = await Promise.all([
        tx.student.findUnique({
          where: { id: senderStudentId },
          select: { id: true, fullName: true, sprStudentId: true },
        }),
        tx.student.findUnique({
          where: { id: recipientStudentId },
          select: { id: true, fullName: true, sprStudentId: true },
        }),
      ]);

      if (!senderStudent) throw new Error('Sender student record not found.');
      if (!recipientStudent) throw new Error('Recipient student record not found.');

      // 2. Fetch sender wallet
      const senderWallet = await tx.studentWallet.findUnique({
        where: { studentId: senderStudentId },
      });

      if (!senderWallet) {
        throw new Error('Sender wallet not found.');
      }

      if (senderWallet.balance.lessThan(amountDecimal)) {
        throw new Error(
          `Insufficient wallet balance. Available: ₹${Number(senderWallet.balance).toFixed(2)}, Requested: ₹${transferAmount.toFixed(2)}.`
        );
      }

      // 3. Ensure recipient wallet exists
      await getOrCreateStudentWallet(recipientStudentId, tx);
      const recipientWallet = await tx.studentWallet.findUniqueOrThrow({
        where: { studentId: recipientStudentId },
      });

      const timestamp = Date.now();
      const referenceOut = `TXN-XFER-${senderStudent.sprStudentId || senderStudent.id.slice(-6)}-${recipientStudent.sprStudentId || recipientStudent.id.slice(-6)}-${timestamp}`;
      const referenceIn = `TXN-RECV-${recipientStudent.sprStudentId || recipientStudent.id.slice(-6)}-${senderStudent.sprStudentId || senderStudent.id.slice(-6)}-${timestamp}`;

      // 4. Update sender and recipient concurrently
      const [updatedSenderWallet, updatedRecipientWallet] = await Promise.all([
        tx.studentWallet.update({
          where: { id: senderWallet.id },
          data: {
            balance: { decrement: amountDecimal },
            totalTransferred: { increment: amountDecimal },
          },
        }),
        tx.studentWallet.update({
          where: { id: recipientWallet.id },
          data: {
            balance: { increment: amountDecimal },
            totalReceived: { increment: amountDecimal },
          },
        }),
      ]);

      // 5. Record transactions concurrently
      await Promise.all([
        tx.walletTransaction.create({
          data: {
            reference: referenceOut,
            studentId: senderStudentId,
            type: 'TRANSFER_SENT',
            amount: amountDecimal,
            balanceBefore: senderWallet.balance,
            balanceAfter: updatedSenderWallet.balance,
            senderStudentId,
            recipientStudentId,
            description: `Transferred ₹${transferAmount.toFixed(2)} to ${recipientStudent.fullName} (${recipientStudent.sprStudentId || 'ID'})${remarks ? ` - ${remarks}` : ''}`,
            status: 'COMPLETED',
          },
        }),
        tx.walletTransaction.create({
          data: {
            reference: referenceIn,
            studentId: recipientStudentId,
            type: 'TRANSFER_RECEIVED',
            amount: amountDecimal,
            balanceBefore: recipientWallet.balance,
            balanceAfter: updatedRecipientWallet.balance,
            senderStudentId,
            recipientStudentId,
            description: `Received ₹${transferAmount.toFixed(2)} from ${senderStudent.fullName} (${senderStudent.sprStudentId || 'ID'})${remarks ? ` - ${remarks}` : ''}`,
            status: 'COMPLETED',
          },
        }),
      ]);

      return {
        senderFullName: senderStudent.fullName,
        referenceOut,
        transferAmount,
        newSenderBalance: Number(updatedSenderWallet.balance),
        recipientName: recipientStudent.fullName,
      };
    },
    {
      maxWait: 15000,
      timeout: 30000,
    }
  );

  // 6. Audit log (after transaction commits)
  logAuditAction({
    userName: result.senderFullName,
    action: 'STUDENT_TRANSFER',
    entity: 'StudentWallet',
    entityId: senderStudentId,
    newValue: {
      amount: result.transferAmount,
      recipientStudentId,
      recipientName: result.recipientName,
      reference: result.referenceOut,
    },
    ipAddress,
    userAgent,
  }).catch(() => {});

  return {
    success: true,
    reference: result.referenceOut,
    amount: result.transferAmount,
    newSenderBalance: result.newSenderBalance,
    recipientName: result.recipientName,
  };
}

/**
 * Transfers funds from a student's personal wallet to their Store contribution fund.
 */
export async function contributeToStoreFund(params: {
  studentId: string;
  amount: number;
  remarks?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const { studentId, amount, remarks, ipAddress, userAgent } = params;

  if (!studentId) throw new Error('Student ID is required.');
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Contribution amount must be greater than zero.');
  }

  const contributionAmount = Math.round((amount + Number.EPSILON) * 100) / 100;
  const amountDecimal = new Prisma.Decimal(contributionAmount);

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Fetch student, wallet, and store fund concurrently
      const [student, wallet, existingStoreFund] = await Promise.all([
        tx.student.findUnique({
          where: { id: studentId },
          select: { id: true, fullName: true, sprStudentId: true },
        }),
        tx.studentWallet.findUnique({
          where: { studentId },
        }),
        tx.storeFundRecord.findUnique({
          where: { studentId },
        }),
      ]);

      if (!student) throw new Error('Student record not found.');
      if (!wallet) throw new Error('Student wallet not found.');

      if (wallet.balance.lessThan(amountDecimal)) {
        throw new Error(
          `Insufficient wallet balance. Available: ₹${Number(wallet.balance).toFixed(2)}, Requested: ₹${contributionAmount.toFixed(2)}.`
        );
      }

      let storeFund = existingStoreFund;
      if (!storeFund) {
        storeFund = await tx.storeFundRecord.create({
          data: {
            studentId,
            totalContributed: new Prisma.Decimal(0),
            totalUsed: new Prisma.Decimal(0),
            availableFund: new Prisma.Decimal(0),
          },
        });
      }

      const timestamp = Date.now();
      const reference = `TXN-STR-SHARE-${student.sprStudentId || student.id.slice(-6)}-${timestamp}`;

      // 2. Perform updates concurrently
      const [updatedWallet, updatedStoreFund] = await Promise.all([
        tx.studentWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: amountDecimal },
            totalContributedToStore: { increment: amountDecimal },
          },
        }),
        tx.storeFundRecord.update({
          where: { id: storeFund.id },
          data: {
            totalContributed: { increment: amountDecimal },
            availableFund: { increment: amountDecimal },
          },
        }),
      ]);

      // 3. Record wallet transaction
      await tx.walletTransaction.create({
        data: {
          reference,
          studentId,
          type: 'STORE_CONTRIBUTION',
          amount: amountDecimal,
          balanceBefore: wallet.balance,
          balanceAfter: updatedWallet.balance,
          description: `Contributed ₹${contributionAmount.toFixed(2)} to School Store Fund${remarks ? ` - ${remarks}` : ''}`,
          status: 'COMPLETED',
        },
      });

      return {
        studentName: student.fullName,
        reference,
        amount: contributionAmount,
        newWalletBalance: Number(updatedWallet.balance),
        newAvailableStoreFund: Number(updatedStoreFund.availableFund),
      };
    },
    {
      maxWait: 15000,
      timeout: 30000,
    }
  );

  // 4. Audit log (after transaction commits)
  logAuditAction({
    userName: result.studentName,
    action: 'STORE_CONTRIBUTION',
    entity: 'StoreFundRecord',
    entityId: studentId,
    newValue: {
      amount: result.amount,
      newAvailableStoreFund: result.newAvailableStoreFund,
      reference: result.reference,
    },
    ipAddress,
    userAgent,
  }).catch(() => {});

  return {
    success: true,
    reference: result.reference,
    amount: result.amount,
    newWalletBalance: result.newWalletBalance,
    newAvailableStoreFund: result.newAvailableStoreFund,
  };
}

/**
 * Store Admin records usage of a student's available Store fund.
 * Does NOT deduct from the student's personal wallet a second time!
 * Does NOT modify SPR points.
 */
export async function useStudentStoreFund(params: {
  studentId: string;
  amount: number;
  actingAdminId: string;
  actingAdminEmail: string;
  remarks?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const { studentId, amount, actingAdminId, actingAdminEmail, remarks, ipAddress, userAgent } = params;

  if (!studentId) throw new Error('Student ID is required.');
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Usage amount must be greater than zero.');
  }

  const usageAmount = Math.round((amount + Number.EPSILON) * 100) / 100;
  const amountDecimal = new Prisma.Decimal(usageAmount);

  const result = await prisma.$transaction(
    async (tx) => {
      const [student, storeFund] = await Promise.all([
        tx.student.findUnique({
          where: { id: studentId },
          select: { id: true, fullName: true, sprStudentId: true },
        }),
        tx.storeFundRecord.findUnique({
          where: { studentId },
        }),
      ]);

      if (!student) throw new Error('Student record not found.');
      if (!storeFund) throw new Error('Student has no Store Fund record.');

      if (storeFund.availableFund.lessThan(amountDecimal)) {
        throw new Error(
          `Insufficient available store fund. Available: ₹${Number(storeFund.availableFund).toFixed(2)}, Requested: ₹${usageAmount.toFixed(2)}.`
        );
      }

      const timestamp = Date.now();
      const reference = `STR-USE-${student.sprStudentId || student.id.slice(-6)}-${timestamp}`;

      // Deduct from availableFund, increment totalUsed
      const updatedStoreFund = await tx.storeFundRecord.update({
        where: { id: storeFund.id },
        data: {
          availableFund: { decrement: amountDecimal },
          totalUsed: { increment: amountDecimal },
          lastUsedAt: new Date(),
        },
      });

      // Record StoreFundUsage entry
      await tx.storeFundUsage.create({
        data: {
          reference,
          studentId,
          amount: amountDecimal,
          actingAdminId,
          actingAdminEmail,
          remarks: remarks || 'Store purchase deduction',
        },
      });

      return {
        studentName: student.fullName,
        reference,
        amountUsed: usageAmount,
        remainingStoreFund: Number(updatedStoreFund.availableFund),
        totalUsed: Number(updatedStoreFund.totalUsed),
      };
    },
    {
      maxWait: 15000,
      timeout: 30000,
    }
  );

  // Audit log after transaction commits
  logAuditAction({
    userId: actingAdminId,
    userName: actingAdminEmail,
    action: 'STORE_FUND_USAGE',
    entity: 'StoreFundRecord',
    entityId: studentId,
    newValue: {
      studentName: result.studentName,
      amountUsed: result.amountUsed,
      remainingFund: result.remainingStoreFund,
      reference: result.reference,
      remarks,
    },
    ipAddress,
    userAgent,
  }).catch(() => {});

  return {
    success: true,
    reference: result.reference,
    amountUsed: result.amountUsed,
    remainingStoreFund: result.remainingStoreFund,
    totalUsed: result.totalUsed,
    studentName: result.studentName,
  };
}
