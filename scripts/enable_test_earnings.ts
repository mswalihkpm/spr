import { prisma } from '../src/lib/prisma';
import { syncStudentEarnings } from '../src/lib/student-earnings';

async function main() {
  console.log('--- ENABLING LOCALHOST TRIAL EARNINGS ---');

  // 1. Set the eligibility start date to 2026-01-01 to cover all academic year records
  const trialDate = '2026-01-01T00:00:00.000Z';
  await prisma.systemSetting.upsert({
    where: { key: 'EARNINGS_ELIGIBILITY_START_DATE' },
    update: { value: trialDate, description: 'Trial eligibility start date for testing' },
    create: {
      key: 'EARNINGS_ELIGIBILITY_START_DATE',
      value: trialDate,
      description: 'Trial eligibility start date for testing',
    },
  });
  console.log(`✓ SystemSetting EARNINGS_ELIGIBILITY_START_DATE set to: ${trialDate}`);

  // 2. Find all students who have active student accounts or records
  const studentsWithAccounts = await prisma.student.findMany({
    where: {
      account: { isNot: null },
    },
    include: {
      account: true,
      performanceRecords: true,
    },
  });

  console.log(`Found ${studentsWithAccounts.length} active student account(s):`);

  for (const s of studentsWithAccounts) {
    const res = await syncStudentEarnings(s.id);
    console.log(`\n========================================`);
    console.log(`Student: ${s.fullName} (${s.sprStudentId})`);
    console.log(`Status: Account Active (${s.account?.username})`);
    console.log(`Performance Records: ${s.performanceRecords.length}`);
    console.log(`Calculated Wallet Balance: ₹${res.wallet.balance.toFixed(2)}`);
    console.log(`Total Lifetime Earnings:  ₹${res.wallet.totalEarnings.toFixed(2)}`);
    console.log(`Category Breakdown:`);
    for (const cat of res.categoryEarnings) {
      console.log(`  • ${cat.categoryName}: ${cat.eligiblePoints} pts × ${cat.multiplier} = ₹${cat.earnings.toFixed(2)}`);
    }
    console.log(`========================================\n`);
  }

  // 3. Also sync all 115 students so whenever any student creates their account, their cash is ready!
  const allStudents = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, fullName: true, sprStudentId: true },
  });

  console.log(`Pre-calculating earnings for all ${allStudents.length} students...`);
  let totalCashDisbursed = 0;
  for (const st of allStudents) {
    const res = await syncStudentEarnings(st.id);
    totalCashDisbursed += res.wallet.balance;
  }
  console.log(`✓ All ${allStudents.length} students synchronized.`);
  console.log(`✓ Total trial cash allocated across school: ₹${totalCashDisbursed.toFixed(2)}`);
}

main().finally(() => prisma.$disconnect());
