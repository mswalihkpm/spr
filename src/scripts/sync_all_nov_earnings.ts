import { prisma } from '../lib/prisma';
import { syncStudentEarnings } from '../lib/student-earnings';

async function main() {
  console.log('--- RECONCILING CASH FOR ALL RECORDS RECORDED AFTER NOVEMBER 1ST ---');

  const students = await prisma.student.findMany({
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
  });

  console.log(`Found ${students.length} students. Syncing earnings...`);
  let updatedCount = 0;
  let totalCashCredited = 0;

  for (const s of students) {
    try {
      const res = await syncStudentEarnings(s.id);
      if (res.wallet.totalEarnings > 0) {
        console.log(`✓ ${s.fullName} -> Wallet Balance: ₹${res.wallet.balance.toFixed(2)} | Lifetime: ₹${res.wallet.totalEarnings.toFixed(2)}`);
        updatedCount++;
        totalCashCredited += res.wallet.balance;
      }
    } catch (err) {
      console.error(`Error syncing student ${s.fullName}:`, err);
    }
  }

  console.log(`\nReconciliation Complete:`);
  console.log(`- Students with active cash: ${updatedCount}`);
  console.log(`- Total cash credited: ₹${totalCashCredited.toFixed(2)}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

