const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('=== CLEANUP: DELETING WALLET TRANSACTIONS FROM LAST 15 DAYS ===');
  
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  console.log('Cutoff date (15 days ago):', fifteenDaysAgo.toISOString());

  // 1. Fetch transactions to delete
  const txnsToDelete = await prisma.walletTransaction.findMany({
    where: {
      createdAt: { gte: fifteenDaysAgo }
    },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Found ${txnsToDelete.length} transactions in the last 15 days.`);

  // 2. Backup to scratch file
  const backupDir = path.join(__dirname, '../src/scratch');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupPath = path.join(backupDir, 'wallet_transactions_backup_15days.json');
  fs.writeFileSync(backupPath, JSON.stringify(txnsToDelete, null, 2), 'utf8');
  console.log(`✅ Backed up ${txnsToDelete.length} transactions to: ${backupPath}`);

  // 3. Capture student wallet balances before deletion to verify zero impact
  const walletsBefore = await prisma.studentWallet.findMany({
    select: { studentId: true, balance: true }
  });
  const balanceMapBefore = new Map(walletsBefore.map(w => [w.studentId, Number(w.balance)]));

  // 4. Delete the transactions
  const deleteResult = await prisma.walletTransaction.deleteMany({
    where: {
      createdAt: { gte: fifteenDaysAgo }
    }
  });
  console.log(`✅ Successfully deleted ${deleteResult.count} WalletTransaction records.`);

  // 5. Verify balances remain identical
  const walletsAfter = await prisma.studentWallet.findMany({
    select: { studentId: true, balance: true }
  });
  let allMatch = true;
  for (const w of walletsAfter) {
    const before = balanceMapBefore.get(w.studentId);
    const after = Number(w.balance);
    if (before !== after) {
      console.error(`Balance mismatch for student ${w.studentId}: before=${before}, after=${after}`);
      allMatch = false;
    }
  }

  if (allMatch) {
    console.log(`✅ VERIFIED: All ${walletsAfter.length} student wallet cash balances remain completely preserved and intact!`);
  }

  const remainingCount = await prisma.walletTransaction.count();
  console.log(`Remaining transactions in DB: ${remainingCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
