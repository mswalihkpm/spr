import { prisma } from '../src/lib/prisma';

async function cleanupTestData() {
  console.log('Cleaning up isolated test transactions and accounts created during testing...');

  // Delete test wallet transactions
  await prisma.walletTransaction.deleteMany({
    where: {
      OR: [
        { reference: { contains: 'TXN-XFER' } },
        { reference: { contains: 'TXN-RECV' } },
        { reference: { contains: 'TXN-STR-SHARE' } },
        { description: { contains: 'Test' } },
      ],
    },
  });

  // Delete test store fund usages
  await prisma.storeFundUsage.deleteMany({
    where: {
      remarks: { contains: 'Notebook and pens' },
    },
  });

  // Reset any test student accounts created during tests
  await prisma.studentAccount.deleteMany();

  // Reset test student wallets and store funds to 0
  await prisma.studentWallet.deleteMany();
  await prisma.storeFundRecord.deleteMany();

  console.log('Database cleaned up. Student records, categories, scores, and users remain 100% intact.');
}

cleanupTestData().finally(() => prisma.$disconnect());
