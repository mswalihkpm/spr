import { prisma } from '../lib/prisma';
import { calculateStudentSPR, calculateAllLeaderboards } from '../lib/spr-engine';

async function main() {
  console.log('=== VERIFYING LEADERBOARD & STUDENT PROFILE CATEGORY BREAKDOWN ===');

  // 1. Check Leaderboards
  const allLeaderboard = await calculateAllLeaderboards();
  console.log(`\n1. Overall Leaderboard: ${allLeaderboard.length} students calculated.`);
  if (allLeaderboard.length === 0) {
    console.log('No students found in DB.');
    return;
  }

  const sampleEntry = allLeaderboard[0];
  console.log(`Top Student: ${sampleEntry.studentName} (ID: ${sampleEntry.studentId}, SPR: ${sampleEntry.spr}%)`);

  // 2. Check Student SPR Profile
  const profile = await calculateStudentSPR(sampleEntry.studentId);
  if (!profile) {
    console.error('Failed to calculate student SPR profile!');
    process.exit(1);
  }

  console.log(`\n2. Student Performance Profile: ${profile.student.fullName}`);
  console.log(`Cumulative SPR: ${profile.overallSPR}%`);
  console.log(`Total Categories: ${profile.categoryScores.length}`);

  profile.categoryScores.forEach((cat: any) => {
    console.log(`\n- Category: ${cat.categoryName} (${cat.categoryCode})`);
    console.log(`  Weight: ${cat.weight}% | Benchmark Score: ${cat.percentage}%`);
    console.log(`  SPR Contribution: +${((cat.percentage * cat.weight) / 100).toFixed(2)}%`);
    console.log(`  Records Count: ${cat.records?.length || 0}`);
    if (cat.records && cat.records.length > 0) {
      cat.records.forEach((r: any, idx: number) => {
        console.log(`    [${idx + 1}] ${r.name || r.title || r.subjectName} | Score: ${r.percentage}% (${r.obtainedScore || 0}/${r.maxScore || 100}) | Context: ${r.examName || r.festName || r.readingPeriod || 'General'}`);
      });
    }
  });

  console.log('\n=== ALL CHECKS PASSED ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
