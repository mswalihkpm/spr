import { prisma } from '../src/lib/prisma';
import { syncStudentEarnings, DEFAULT_ELIGIBILITY_START_DATE } from '../src/lib/student-earnings';

async function main() {
  console.log('--- REVERTING TO PRODUCTION PRE-RELEASE STATE ---');

  // 1. Reset the eligibility start date back to November 3, 2026
  await prisma.systemSetting.upsert({
    where: { key: 'EARNINGS_ELIGIBILITY_START_DATE' },
    update: { value: DEFAULT_ELIGIBILITY_START_DATE, description: 'Production release date' },
    create: {
      key: 'EARNINGS_ELIGIBILITY_START_DATE',
      value: DEFAULT_ELIGIBILITY_START_DATE,
      description: 'Production release date',
    },
  });
  console.log(`✓ SystemSetting EARNINGS_ELIGIBILITY_START_DATE reset to: ${DEFAULT_ELIGIBILITY_START_DATE}`);

  // 2. Clear trial ledger and transaction entries created during trial
  console.log('Resetting trial earnings ledgers and test transactions...');
  await prisma.walletTransaction.deleteMany({});
  await prisma.earningLedger.deleteMany({});
  await prisma.storeFundUsage.deleteMany({});
  await prisma.storeFundRecord.updateMany({
    data: {
      totalContributed: 0,
      totalUsed: 0,
      availableFund: 0,
    },
  });
  await prisma.studentWallet.updateMany({
    data: {
      balance: 0,
      totalEarnings: 0,
      totalTransferred: 0,
      totalReceived: 0,
      totalContributedToStore: 0,
    },
  });

  console.log('✓ All student wallets and store funds safely reset to ₹0.00 for pre-release status.');
}

main().finally(() => prisma.$disconnect());
