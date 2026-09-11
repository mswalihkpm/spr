import { prisma } from '../lib/prisma';
import { calculateStudentSPR, calculateAllLeaderboards } from '../lib/spr-engine';

async function test() {
  console.log('--- Testing New SPR Engine ---');
  const students = await prisma.student.findMany({ take: 5 });
  for (const s of students) {
    const profile = await calculateStudentSPR(s.id);
    if (!profile) continue;
    console.log(`\nStudent: ${s.fullName} (${s.studentId} / ${s.sprStudentId})`);
    console.log(`Final SPR: ${profile.overallSPR}% (Normalized Score: ${profile.normalizedScore})`);
    console.log(`Raw Weighted Sum: ${profile.rawWeightedTotal}, Max Weighted Sum: ${profile.maxWeightedTotal}`);
    console.log('Category Breakdown:');
    profile.categoryScores.forEach((c) => {
      console.log(` - [${c.categoryCode}] ${c.categoryName} (Weight: ${c.weight}): Input: ${c.rawInput}, Normalized: ${c.normalizedPercentage}%, Contribution: +${c.weightedContribution}% | Formula: ${c.formula}`);
    });
  }

  const lb = await calculateAllLeaderboards();
  console.log(`\nTotal Leaderboard Students: ${lb.length}`);
  console.log('Top 5 on Leaderboard:');
  lb.slice(0, 5).forEach((e) => {
    console.log(` #${e.rank}: ${e.name} (${e.className}) -> SPR: ${e.spr}%`);
  });
}

test().catch(console.error).finally(() => prisma.$disconnect());
