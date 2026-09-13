import { prisma } from '../lib/prisma';
import { calculateStudentSPR, calculateAllLeaderboards, invalidateEngineCache } from '../lib/spr-engine';

async function main() {
  invalidateEngineCache();
  console.log('=== VERIFYING SPR SCORING RULES ===');

  // Find students in database
  const students = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    include: {
      class: true,
      school: true,
      libraryRecords: true,
      performanceRecords: { include: { category: true, subcategory: true } },
      creativeWorks: true,
    },
  });

  console.log(`Checking ${students.length} active students...`);

  let checkedCount = 0;
  let mismatchCount = 0;

  for (const st of students) {
    const profile = await calculateStudentSPR(st.id);
    if (!profile) {
      console.error(`Failed to calculate SPR for student ${st.fullName} (${st.id})`);
      mismatchCount++;
      continue;
    }

    const catScores = profile.categoryScores || [];
    const directSum = Number(
      catScores.reduce((sum, cs) => sum + (cs.isIncluded ? cs.earnedPoints : 0), 0).toFixed(2)
    );

    if (Math.abs(profile.overallSPR - directSum) > 0.01) {
      console.error(`Mismatch for student ${st.fullName} (${st.id}): profile.overallSPR=${profile.overallSPR}, directSum=${directSum}`);
      mismatchCount++;
    }

    // Check Library category
    const libCat = catScores.find(c => c.categoryCode === 'LIBRARY');
    if (libCat && (st.libraryRecords.length > 0 || st.performanceRecords.some(r => r.category.code === 'LIBRARY'))) {
      const imthiyaazPts = st.libraryRecords.reduce((sum, r) => {
        const pts = typeof r.readingScore === 'number' && !isNaN(r.readingScore) ? r.readingScore : ((r.booksRead || 0) * 20);
        return sum + pts;
      }, 0);
      const kuthbkhanaPts = st.performanceRecords
        .filter(r => r.category.code === 'LIBRARY')
        .reduce((sum, r) => {
          const mult = typeof r.subcategory?.weight === 'number' && r.subcategory.weight > 0 ? r.subcategory.weight : 1.0;
          return sum + ((r.obtainedScore || 0) * mult);
        }, 0);
      const expectedLibPts = Number((imthiyaazPts + kuthbkhanaPts).toFixed(2));

      if (Math.abs(libCat.earnedPoints - expectedLibPts) > 0.01) {
        console.error(`Library points mismatch for ${st.fullName}: libCat.earnedPoints=${libCat.earnedPoints}, expected=${expectedLibPts}`);
        mismatchCount++;
      }
    }

    checkedCount++;
  }

  console.log(`Checked ${checkedCount} students. Direct Sum Mismatches: ${mismatchCount}`);

  // Check Leaderboard alignment
  console.log('\n--- Checking Leaderboard vs Profile Alignment ---');
  const leaderboard = await calculateAllLeaderboards();
  let lbMismatch = 0;
  for (const entry of leaderboard.slice(0, 30)) {
    const profile = await calculateStudentSPR(entry.studentId);
    if (!profile) continue;
    if (Math.abs(entry.spr - profile.overallSPR) > 0.01) {
      console.error(`Leaderboard vs Profile mismatch for ${entry.name}: lb.spr=${entry.spr}, prof.overallSPR=${profile.overallSPR}`);
      lbMismatch++;
    }
  }
  console.log(`Leaderboard alignment checked on top 30 students. Mismatches: ${lbMismatch}`);

  if (mismatchCount === 0 && lbMismatch === 0) {
    console.log('\n>>> SUCCESS: ALL SCORING AND DIRECT SUM CHECKS PASSED PERFECTLY! <<<');
  } else {
    console.error('\n>>> FAILED: Discrepancies detected! <<<');
    process.exit(1);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
