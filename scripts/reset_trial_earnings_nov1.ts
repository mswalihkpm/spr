import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- RESETTING TRIAL CASH & SETTING ELIGIBILITY START DATE TO NOV 1, 2026 ---');

  // 1. Update or create EARNINGS_ELIGIBILITY_START_DATE setting
  const startDateStr = '2026-11-01T00:00:00.000Z';
  await prisma.systemSetting.upsert({
    where: { key: 'EARNINGS_ELIGIBILITY_START_DATE' },
    update: {
      value: startDateStr,
      description: 'Official earnings eligibility start date (records prior to this date earn 0 cash)',
    },
    create: {
      key: 'EARNINGS_ELIGIBILITY_START_DATE',
      value: startDateStr,
      description: 'Official earnings eligibility start date (records prior to this date earn 0 cash)',
    },
  });
  console.log(`✓ SystemSetting EARNINGS_ELIGIBILITY_START_DATE set to: ${startDateStr}`);

  // 2. Delete test / trial wallet transactions
  const deletedTransactions = await prisma.walletTransaction.deleteMany({});
  console.log(`✓ Deleted ${deletedTransactions.count} trial WalletTransaction record(s)`);

  // 3. Delete trial earning ledgers
  const deletedLedgers = await prisma.earningLedger.deleteMany({});
  console.log(`✓ Deleted ${deletedLedgers.count} trial EarningLedger record(s)`);

  // 4. Delete store fund usage records if any
  const deletedStoreUsage = await prisma.storeFundUsage.deleteMany({});
  console.log(`✓ Deleted ${deletedStoreUsage.count} StoreFundUsage record(s)`);

  // 5. Reset all StudentWallets
  const updatedWallets = await prisma.studentWallet.updateMany({
    data: {
      balance: 0,
      totalEarnings: 0,
      totalTransferred: 0,
      totalReceived: 0,
      totalContributedToStore: 0,
    },
  });
  console.log(`✓ Reset ${updatedWallets.count} StudentWallet record(s) to 0.00`);

  // 6. Reset all StoreFundRecords
  const updatedStoreFunds = await prisma.storeFundRecord.updateMany({
    data: {
      totalContributed: 0,
      totalUsed: 0,
      availableFund: 0,
    },
  });
  console.log(`✓ Reset ${updatedStoreFunds.count} StoreFundRecord record(s) to 0.00`);

  console.log('\n--- TRIAL CASH CLEARING COMPLETE: ALL NEW RECORDINGS FROM NOVEMBER 1 WILL BE ELIGIBLE FOR WALLET CASH ---');
}

main()
  .catch((err) => {
    console.error('Error running reset script:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
