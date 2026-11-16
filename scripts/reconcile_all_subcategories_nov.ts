import { prisma } from '../src/lib/prisma';
import { syncStudentEarnings, getEarningsEligibilityStartDate } from '../src/lib/student-earnings';

async function main() {
  console.log('=== STARTING RECONCILIATION OF ALL NOVEMBER SUBCATEGORY EARNINGS ===');
  const eligibilityDate = await getEarningsEligibilityStartDate();
  console.log('Eligibility Start Date:', eligibilityDate.toISOString());

  const students = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, sprStudentId: true, fullName: true },
    orderBy: { sprStudentId: 'asc' },
  });

  console.log(`Found ${students.length} active students. Reconciling earnings...`);

  let totalCreditedStudents = 0;
  let totalEarningsDisbursed = 0;
  const ledgerReport: Array<{
    sprStudentId: string;
    fullName: string;
    balance: number;
    totalEarnings: number;
    categories: Array<{ name: string; points: number; mult: number; earnings: number }>;
  }> = [];

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    try {
      const result = await syncStudentEarnings(s.id);
      const activeCats = result.categoryEarnings.filter((c) => c.earnings > 0 || c.eligiblePoints > 0);

      if (result.wallet.totalEarnings > 0 || activeCats.length > 0) {
        totalCreditedStudents++;
        totalEarningsDisbursed += result.wallet.totalEarnings;
        ledgerReport.push({
          sprStudentId: s.sprStudentId || 'N/A',
          fullName: s.fullName,
          balance: result.wallet.balance,
          totalEarnings: result.wallet.totalEarnings,
          categories: activeCats.map((c) => ({
            name: c.categoryName,
            points: c.eligiblePoints,
            mult: c.multiplier,
            earnings: c.earnings,
          })),
        });
      }

      if ((i + 1) % 25 === 0 || i + 1 === students.length) {
        console.log(`Processed ${i + 1}/${students.length} students...`);
      }
    } catch (err: any) {
      console.error(`Error syncing student ${s.sprStudentId} (${s.fullName}):`, err.message);
    }
  }

  console.log('\n=== RECONCILIATION SUMMARY ===');
  console.log(`Total active students evaluated: ${students.length}`);
  console.log(`Students with active earnings: ${totalCreditedStudents}`);
  console.log(`Total earnings across all wallets: ₹${totalEarningsDisbursed.toFixed(2)}`);

  console.log('\n=== DETAILED ITEMIZATION BY STUDENT ===');
  for (const item of ledgerReport) {
    console.log(`\n[${item.sprStudentId}] ${item.fullName} | Balance: ₹${item.balance.toFixed(2)} | Lifetime: ₹${item.totalEarnings.toFixed(2)}`);
    for (const cat of item.categories) {
      console.log(`   └─ ${cat.name}: ${cat.points} pts × ${cat.mult} = ₹${cat.earnings.toFixed(2)}`);
    }
  }

  console.log('\n=== RECONCILIATION COMPLETED SUCCESSFULLY ===');
}

main()
  .catch((err) => {
    console.error('Fatal error during reconciliation:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
