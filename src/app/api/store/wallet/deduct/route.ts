export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { logAuditAction } from '@/lib/audit';
import { generateStrong8DigitCode } from '@/lib/qr-service';

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'STORE_ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { studentId, amount, item, remarks } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'Student identifier is required.' }, { status: 400 });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: 'Valid deduction amount greater than ₹0 is required.' },
        { status: 400 }
      );
    }

    // Exact 2-decimal rounded amount
    const deductionAmount = Math.round((numericAmount + Number.EPSILON) * 100) / 100;
    const amountDecimal = new Prisma.Decimal(deductionAmount);

    const cleanInput = String(studentId).trim();
    const cleanUpper = cleanInput.toUpperCase();
    const is8Digit = /^\d{8}$/.test(cleanInput);

    // Resolve student
    let matchedStudent = null;
    if (is8Digit) {
      const allStudentsForLookup = await prisma.student.findMany({
        select: { id: true, fullName: true, sprStudentId: true, studentId: true },
      });
      const match = allStudentsForLookup.find(
        (s) => generateStrong8DigitCode(s.id, s.sprStudentId) === cleanInput
      );
      if (match) {
        matchedStudent = match;
      }

      if (!matchedStudent && cleanInput.startsWith('2026')) {
        const suffix = cleanInput.slice(4);
        const numVal = parseInt(suffix, 10);
        matchedStudent = await prisma.student.findFirst({
          where: {
            OR: [
              { sprStudentId: cleanUpper },
              { sprStudentId: `SPR${suffix}` },
              { sprStudentId: `SPR${numVal.toString().padStart(4, '0')}` },
              { sprStudentId: `SPR${numVal}` },
              { studentId: { contains: suffix } },
            ],
          },
          select: { id: true, fullName: true, sprStudentId: true, studentId: true },
        });
      }
    }

    if (!matchedStudent) {
      matchedStudent = await prisma.student.findFirst({
        where: {
          OR: [
            { id: cleanInput },
            { sprStudentId: cleanUpper },
            { sprStudentId: cleanUpper.startsWith('SPR') ? cleanUpper : `SPR${cleanUpper}` },
            { studentId: cleanUpper },
          ],
        },
        select: { id: true, fullName: true, sprStudentId: true, studentId: true },
      });
    }

    if (!matchedStudent) {
      return NextResponse.json({ error: `Student "${cleanInput}" not found.` }, { status: 404 });
    }

    const canonicalStudentId = matchedStudent.id;
    const itemName = item && String(item).trim() ? String(item).trim() : 'Campus Store Purchase';
    const note = remarks && String(remarks).trim() ? String(remarks).trim() : '';

    // Atomic deduction transaction
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Get or create wallet
        let wallet = await tx.studentWallet.findUnique({
          where: { studentId: canonicalStudentId },
        });

        if (!wallet) {
          wallet = await tx.studentWallet.create({
            data: {
              studentId: canonicalStudentId,
              balance: new Prisma.Decimal(0),
              totalEarnings: new Prisma.Decimal(0),
            },
          });
        }

        if (wallet.balance.lessThan(amountDecimal)) {
          throw new Error(
            `Insufficient wallet balance. Available: ₹${Number(wallet.balance).toFixed(2)}, Required: ₹${deductionAmount.toFixed(2)}.`
          );
        }

        const timestamp = Date.now();
        const reference = `STR-TXN-${matchedStudent.sprStudentId || matchedStudent.id.slice(-6)}-${timestamp}`;

        // 2. Decrement wallet balance & increment totalSpent
        const updatedWallet = await tx.studentWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: amountDecimal },
            totalContributedToStore: { increment: amountDecimal },
          },
        });

        // 3. Create WalletTransaction
        const description = `${itemName}${note ? ` (${note})` : ''} - Paid via Student Wallet`;
        const transaction = await tx.walletTransaction.create({
          data: {
            reference,
            studentId: canonicalStudentId,
            type: 'STORE_PURCHASE',
            amount: amountDecimal,
            balanceBefore: wallet.balance,
            balanceAfter: updatedWallet.balance,
            description,
            status: 'COMPLETED',
          },
        });

        // 4. Also create StoreFundUsage record for audit & history
        await tx.storeFundUsage.create({
          data: {
            reference,
            studentId: canonicalStudentId,
            amount: amountDecimal,
            actingAdminId: user.id,
            actingAdminEmail: user.email,
            remarks: description,
          },
        }).catch((err) => {
          console.warn('Optional StoreFundUsage logging error (non-fatal):', err);
        });

        return {
          reference,
          studentName: matchedStudent.fullName,
          sprStudentId: matchedStudent.sprStudentId,
          amountDeducted: deductionAmount,
          newBalance: Number(updatedWallet.balance),
          balanceBefore: Number(wallet.balance),
          transaction: {
            id: transaction.id,
            reference: transaction.reference,
            type: transaction.type,
            amount: Number(transaction.amount),
            balanceAfter: Number(transaction.balanceAfter),
            description: transaction.description,
            status: transaction.status,
            date: transaction.createdAt.toISOString(),
          },
        };
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    // Audit log
    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    logAuditAction({
      userName: user.email || 'Store Admin',
      action: 'STORE_PURCHASE_DEDUCTION',
      entity: 'StudentWallet',
      entityId: canonicalStudentId,
      newValue: {
        reference: result.reference,
        studentName: result.studentName,
        sprStudentId: result.sprStudentId,
        amountDeducted: result.amountDeducted,
        newBalance: result.newBalance,
        actingAdminEmail: user.email,
      },
      ipAddress,
      userAgent,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `₹${result.amountDeducted.toFixed(2)} deducted successfully for ${result.studentName}. Remaining balance: ₹${result.newBalance.toFixed(2)}.`,
      data: result,
    });
  } catch (error: any) {
    console.error('Store wallet deduction error:', error);
    return NextResponse.json(
      { error: error.message || 'Store wallet deduction failed.' },
      { status: 400 }
    );
  }
}
