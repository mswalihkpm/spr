import { prisma } from '../lib/prisma';
import { calculateStudentSPR, calculateAllLeaderboards } from '../lib/spr-engine';

async function testTopStudents() {
  const allLeaderboard = await calculateAllLeaderboards();
  const topStudents = allLeaderboard.slice(0, 10);

  console.log(`Testing ${topStudents.length} top ranked students...`);

  for (const entry of topStudents) {
    const profile = await calculateStudentSPR(entry.studentId);
    if (!profile) continue;

    console.log(`Rank #${entry.rank}: ${entry.name} - SPR: ${entry.spr} pts`);
  }
}

testTopStudents().catch(console.error).finally(() => prisma.$disconnect());
