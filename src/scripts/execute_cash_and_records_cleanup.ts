import { prisma } from '../lib/prisma';
import { invalidateEngineCache } from '../lib/spr-engine';
import { logAuditAction } from '../lib/audit';

async function main() {
  console.log('================================================================');
  console.log('SPR SYSTEM: EXECUTING CASH CREDITS & TRIAL RECORDS CLEANUP');
  console.log('================================================================\n');

  await prisma.$transaction(async (tx) => {
    // ------------------------------------------------------------------------
    // 1. ALL CASHES CREDITED FOR SEPTEMBER MONTH ATTENDANCE
    // ------------------------------------------------------------------------
    console.log('--- Step 1: Identifying September Attendance Cash Credits ---');
    const septLedgers = await tx.earningLedger.findMany({
      where: {
        sourceType: 'MONTHLY_ATTENDANCE',
        OR: [
          { metadata: { contains: '"month":9' } },
          { metadata: { contains: '"monthName":"September"' } },
          { reference: { contains: 'September' } }
        ]
      },
      include: {
        student: {
          include: { wallet: true }
        }
      }
    });

    console.log(`Found ${septLedgers.length} September Attendance Earning Ledgers.`);

    // Group deductions by student
    const septDeductionsByStudent = new Map<string, {
      studentId: string;
      fullName: string;
      sprStudentId: string | null;
      totalAmount: number;
      ledgerIds: string[];
      references: string[];
      sourceRecordIds: string[];
    }>();

    for (const l of septLedgers) {
      const amt = Number(l.recognizedAmount);
      const existing = septDeductionsByStudent.get(l.studentId) || {
        studentId: l.studentId,
        fullName: l.student.fullName,
        sprStudentId: l.student.sprStudentId,
        totalAmount: 0,
        ledgerIds: [],
        references: [],
        sourceRecordIds: [],
      };
      existing.totalAmount += amt;
      existing.ledgerIds.push(l.id);
      existing.references.push(l.reference);
      if (l.sourceRecordId) existing.sourceRecordIds.push(l.sourceRecordId);
      septDeductionsByStudent.set(l.studentId, existing);
    }

    let totalSeptCashRemoved = 0;

    for (const [studentId, data] of Array.from(septDeductionsByStudent.entries())) {
      const wallet = await tx.studentWallet.findUnique({ where: { studentId } });
      if (wallet) {
        const curBal = Number(wallet.balance);
        const curEarn = Number(wallet.totalEarnings);
        const deduction = Math.round((data.totalAmount + Number.EPSILON) * 100) / 100;
        const newBal = Math.max(0, Math.round((curBal - deduction + Number.EPSILON) * 100) / 100);
        const newEarn = Math.max(0, Math.round((curEarn - deduction + Number.EPSILON) * 100) / 100);

        await tx.studentWallet.update({
          where: { studentId },
          data: {
            balance: newBal,
            totalEarnings: newEarn,
            updatedAt: new Date(),
          }
        });
        totalSeptCashRemoved += deduction;
      }
    }

    // Delete corresponding wallet transactions for September attendance
    const septTxnsDeleted = await tx.walletTransaction.deleteMany({
      where: {
        OR: [
          { description: { contains: 'September 2026', mode: 'insensitive' } },
          { description: { contains: 'Islamic Studies Attendance (September', mode: 'insensitive' } },
          { reference: { in: septLedgers.map(l => `TXN-${l.reference}`) } },
          ...septLedgers.map(l => ({ reference: { contains: `TXN-ADJ-${l.sourceRecordId}` } }))
        ]
      }
    });

    // Delete September earning ledgers
    const septLedgersDeleted = await tx.earningLedger.deleteMany({
      where: {
        id: { in: septLedgers.map(l => l.id) }
      }
    });

    console.log(`✓ Step 1 Complete:`);
    console.log(`  - Students adjusted: ${septDeductionsByStudent.size}`);
    console.log(`  - Total September Cash Removed: ₹${totalSeptCashRemoved.toFixed(2)}`);
    console.log(`  - Ledgers deleted: ${septLedgersDeleted.count}`);
    console.log(`  - Transactions deleted: ${septTxnsDeleted.count}`);

    // Verify September MonthlyAttendance records remain intact
    const remainingSeptAttendances = await tx.monthlyAttendance.count({
      where: {
        OR: [
          { month: 9 },
          { monthName: 'September' }
        ]
      }
    });
    console.log(`  - Confirmed: ${remainingSeptAttendances} September MonthlyAttendance records remain preserved in academic archive.`);

    // ------------------------------------------------------------------------
    // 2. MUHAMMAD SWALIH MT - FIELD COLLECTION TRIAL RECORD & CASH
    // ------------------------------------------------------------------------
    console.log('\n--- Step 2: Removing Muhammad Swalih MT Field Collection Trial & Cash ---');
    const swalih = await tx.student.findFirst({
      where: { fullName: 'MUHAMMAD SWALIH MT' },
      include: {
        wallet: true,
        performanceRecords: {
          where: { category: { code: 'FIELD_COLLECTION' } }
        },
        earningLedgers: {
          where: { category: { code: 'FIELD_COLLECTION' } }
        }
      }
    });

    if (swalih) {
      let swalihDeduction = 0;
      for (const l of swalih.earningLedgers) {
        swalihDeduction += Number(l.recognizedAmount);
      }

      if (swalih.wallet && swalihDeduction > 0) {
        const curBal = Number(swalih.wallet.balance);
        const curEarn = Number(swalih.wallet.totalEarnings);
        const newBal = Math.max(0, Math.round((curBal - swalihDeduction + Number.EPSILON) * 100) / 100);
        const newEarn = Math.max(0, Math.round((curEarn - swalihDeduction + Number.EPSILON) * 100) / 100);

        await tx.studentWallet.update({
          where: { id: swalih.wallet.id },
          data: {
            balance: newBal,
            totalEarnings: newEarn,
            updatedAt: new Date(),
          }
        });
      }

      // Delete transactions for Field Collection
      const swalihTxnsDeleted = await tx.walletTransaction.deleteMany({
        where: {
          studentId: swalih.id,
          OR: [
            { description: { contains: 'Field Collection', mode: 'insensitive' } },
            { reference: { in: swalih.earningLedgers.map(l => `TXN-${l.reference}`) } }
          ]
        }
      });

      // Delete earning ledgers for Field Collection
      const swalihLedgersDeleted = await tx.earningLedger.deleteMany({
        where: {
          studentId: swalih.id,
          id: { in: swalih.earningLedgers.map(l => l.id) }
        }
      });

      // Delete trial PerformanceRecord
      const swalihPrDeleted = await tx.performanceRecord.deleteMany({
        where: {
          id: { in: swalih.performanceRecords.map(r => r.id) }
        }
      });

      console.log(`✓ Step 2 Complete for Muhammad Swalih MT:`);
      console.log(`  - Field Collection Cash Removed: ₹${swalihDeduction.toFixed(2)}`);
      console.log(`  - Performance records deleted: ${swalihPrDeleted.count}`);
      console.log(`  - Earning ledgers deleted: ${swalihLedgersDeleted.count}`);
      console.log(`  - Transactions deleted: ${swalihTxnsDeleted.count}`);
    } else {
      console.warn('Student MUHAMMAD SWALIH MT not found!');
    }

    // ------------------------------------------------------------------------
    // 3. MUHAMMED LUQMAN V - OCTOBER ATTENDANCE CASH (ONLY CASH)
    // ------------------------------------------------------------------------
    console.log('\n--- Step 3: Removing Muhammed Luqman V October Attendance Credited Cash ---');
    const luqman = await tx.student.findFirst({
      where: { fullName: 'MUHAMMED LUQMAN V' },
      include: {
        wallet: true,
        monthlyAttendances: {
          where: { month: 10 }
        },
        earningLedgers: {
          where: {
            sourceType: 'MONTHLY_ATTENDANCE',
            metadata: { contains: '"month":10' }
          }
        }
      }
    });

    if (luqman) {
      let luqmanDeduction = 0;
      for (const l of luqman.earningLedgers) {
        luqmanDeduction += Number(l.recognizedAmount);
      }

      if (luqman.wallet && luqmanDeduction > 0) {
        const curBal = Number(luqman.wallet.balance);
        const curEarn = Number(luqman.wallet.totalEarnings);
        const newBal = Math.max(0, Math.round((curBal - luqmanDeduction + Number.EPSILON) * 100) / 100);
        const newEarn = Math.max(0, Math.round((curEarn - luqmanDeduction + Number.EPSILON) * 100) / 100);

        await tx.studentWallet.update({
          where: { id: luqman.wallet.id },
          data: {
            balance: newBal,
            totalEarnings: newEarn,
            updatedAt: new Date(),
          }
        });
      }

      // Delete transactions for October attendance for Luqman
      const luqmanTxnsDeleted = await tx.walletTransaction.deleteMany({
        where: {
          studentId: luqman.id,
          OR: [
            { description: { contains: 'Attendance (October 2026)', mode: 'insensitive' } },
            { reference: { in: luqman.earningLedgers.map(l => `TXN-${l.reference}`) } }
          ]
        }
      });

      // Delete earning ledger for October attendance for Luqman
      const luqmanLedgersDeleted = await tx.earningLedger.deleteMany({
        where: {
          studentId: luqman.id,
          id: { in: luqman.earningLedgers.map(l => l.id) }
        }
      });

      console.log(`✓ Step 3 Complete for Muhammed Luqman V:`);
      console.log(`  - October Attendance Cash Removed: ₹${luqmanDeduction.toFixed(2)}`);
      console.log(`  - Earning ledgers deleted: ${luqmanLedgersDeleted.count}`);
      console.log(`  - Transactions deleted: ${luqmanTxnsDeleted.count}`);
      console.log(`  - Confirmed: His October MonthlyAttendance record (${luqman.monthlyAttendances.length} record, ${luqman.monthlyAttendances[0]?.percentage}%) remains completely PRESERVED in academic database.`);
    } else {
      console.warn('Student MUHAMMED LUQMAN V not found!');
    }
  }, { timeout: 120000, maxWait: 30000 });

  // Invalidate SPR engine cache
  invalidateEngineCache();

  // Audit log entry
  try {
    const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (admin) {
      await logAuditAction({
        userId: admin.id,
        userName: admin.name,
        action: 'CLEANUP_TRIAL_CASH_AND_RECORDS',
        entity: 'StudentWallet',
        newValue: {
          reason: 'User requested removal of trial cash credits for September attendance, Swalih MT field collection, and Luqman V October attendance cash.',
          timestamp: new Date().toISOString(),
        }
      });
    }
  } catch (err) {
    console.warn('Audit log write error:', err);
  }

  // Final sanity check of total wallet balances
  const finalWallets = await prisma.studentWallet.findMany();
  let totalBal = 0;
  let totalEarn = 0;
  for (const w of finalWallets) {
    totalBal += Number(w.balance);
    totalEarn += Number(w.totalEarnings);
  }

  console.log('\n================================================================');
  console.log('CLEANUP SUMMARY & INSTITUTIONAL TOTALS');
  console.log('================================================================');
  console.log(`- Final Total Active Wallet Balances: ₹${totalBal.toFixed(2)}`);
  console.log(`- Final Total Lifetime Cash Offered: ₹${totalEarn.toFixed(2)}`);
  console.log('All operations successfully completed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
