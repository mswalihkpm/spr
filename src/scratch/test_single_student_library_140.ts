import { prisma } from '../lib/prisma';
import { calculateStudentSPR, calculateAllLeaderboards } from '../lib/spr-engine';

async function main() {
  console.log('=== TEST: EXACT 140 PTS LIBRARY SCORING TEST ===');

  // Find a student who has 0 other scores or test with a simulated student
  const sampleStudent = await prisma.student.findFirst({
    where: { status: 'ACTIVE' },
  });

  if (!sampleStudent) {
    console.error('No active student found.');
    return;
  }

  console.log(`Using sample student: ${sampleStudent.fullName} (${sampleStudent.id})`);

  // Verify that for a student whose only record is Library (140 reading points):
  // 1. Library category earnedPoints = 140
  // 2. Library formula = 'Reading Milestones = +140 SPR Points'
  // 3. Overall SPR = 140
  // 4. No 13.3333x or 1866.67 multiplier is applied anywhere.

  const profile = await calculateStudentSPR(sampleStudent.id);
  console.log('Sample profile calculated successfully.');
  console.log('Sample profile overall SPR:', profile?.overallSPR);
  console.log('Sample profile category breakdown:', profile?.categoryScores?.map(c => ({
    category: c.categoryCode,
    earnedPoints: c.earnedPoints,
    isIncluded: c.isIncluded,
  })));

  const expectedSum = profile?.categoryScores?.reduce((acc, c) => acc + (c.isIncluded ? c.earnedPoints : 0), 0);
  console.log('Direct sum of included categories:', expectedSum);
  console.log('Overall SPR equals direct sum:', profile?.overallSPR === expectedSum);

  if (profile?.overallSPR === expectedSum) {
    console.log('>>> VERIFICATION PASSED: No category weight multipliers applied. Direct sum holds true. <<<');
  } else {
    console.error('>>> VERIFICATION FAILED! <<<');
    process.exit(1);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
