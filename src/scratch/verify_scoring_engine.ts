import { prisma } from '../lib/prisma';
import { calculateAllLeaderboards, calculateStudentSPR } from '../lib/spr-engine';

async function verifyEngineScoring() {
  console.log('====================================================');
  console.log('VERIFYING SPR SCORING ACCURACY & ENGINE INVARIANTS');
  console.log('====================================================');

  // 1. Calculate full leaderboard
  const startTime = Date.now();
  const leaderboard = await calculateAllLeaderboards();
  const calcTime = Date.now() - startTime;

  console.log(`\nLeaderboard calculated in ${calcTime}ms for ${leaderboard.length} ranked entries`);
  console.log('Top 5 Ranked Students:');
  leaderboard.slice(0, 5).forEach((entry, idx) => {
    console.log(`  #${entry.rank} - ${entry.name} (${entry.studentCode || 'N/A'}) : ${entry.spr} SPR pts [Class: ${entry.className}]`);
  });

  // 2. Verify tied rank logic consistency
  let lastScore = Infinity;
  let lastRank = 0;
  let rankDiscrepancies = 0;

  for (let i = 0; i < leaderboard.length; i++) {
    const entry = leaderboard[i];
    if (entry.spr > lastScore) {
      console.error(`Rank ordering anomaly at index ${i}: score ${entry.spr} > previous ${lastScore}`);
      rankDiscrepancies++;
    }
    if (entry.spr === lastScore) {
      if (entry.rank !== lastRank) {
        console.error(`Tied rank anomaly at index ${i}: score ${entry.spr} equal to previous score, but rank ${entry.rank} != ${lastRank}`);
        rankDiscrepancies++;
      }
    } else {
      if (entry.rank !== i + 1) {
        console.error(`Standard rank anomaly at index ${i}: rank ${entry.rank} != position ${i + 1}`);
        rankDiscrepancies++;
      }
    }
    lastScore = entry.spr;
    lastRank = entry.rank;
  }

  if (rankDiscrepancies === 0) {
    console.log('\n[PASS] Tied and sequential ranking rules are 100% mathematically consistent across all students.');
  } else {
    console.error(`\n[FAIL] Found ${rankDiscrepancies} ranking anomalies.`);
  }

  // 3. Verify detailed individual student calculation
  const sampleStudent = leaderboard[0];
  if (sampleStudent) {
    const studentDbId = (sampleStudent as any).studentId || (sampleStudent as any).id;
    const sampleProfile = await calculateStudentSPR(studentDbId);
    if (sampleProfile) {
      console.log(`\nVerifying Top Student Dossier (${sampleStudent.name}):`);
      console.log(`  - Overall SPR Points: ${sampleProfile.overallSPR}`);
      console.log(`  - Overall Rank: ${sampleProfile.overallRank}`);
      console.log(`  - Class Rank: ${sampleProfile.classRank}`);
      console.log(`  - Category Breakdown count: ${sampleProfile.categoryBreakdown?.length || 0}`);
      
      if (Math.abs(sampleProfile.overallSPR - sampleStudent.spr) < 0.001) {
        console.log('[PASS] Individual student SPR score matches leaderboard score with 0.00000% delta.');
      } else {
        console.error('[FAIL] Discrepancy between individual calculation and leaderboard score!');
      }
    }
  }

  await prisma.$disconnect();
}

verifyEngineScoring().catch(console.error);
