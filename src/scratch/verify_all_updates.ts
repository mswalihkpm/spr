import fs from 'fs';
import path from 'path';
import { getCategoryLogo } from '../lib/category-utils';
import { calculateStudentSPR, calculateAllLeaderboards } from '../lib/spr-engine';
import { prisma } from '../lib/prisma';

async function verify() {
  console.log('=== 1. VERIFYING ALL 5 LOGO ASSETS IN PUBLIC DIRECTORY ===');
  const expectedLogos = [
    { name: 'Programs & Leadership', file: 'programs-logo.png', code: 'PROGRAMS' },
    { name: 'Literary Programmes', file: 'literary-logo.png', code: 'LITERARY' },
    { name: 'Qualification', file: 'qualification-logo.png', code: 'QUALIFICATION' },
    { name: 'Library', file: 'library-logo.png', code: 'LIBRARY' },
    { name: 'School Studies', file: 'school-studies-logo.png', code: 'SCHOOL' },
  ];

  for (const item of expectedLogos) {
    const fullPath = path.join(process.cwd(), 'public', item.file);
    const exists = fs.existsSync(fullPath);
    const size = exists ? fs.statSync(fullPath).size : 0;
    const resolvedUrl = getCategoryLogo(item.code);
    console.log(`[Logo Check] ${item.name} (${item.code}):`);
    console.log(`  - File exists: ${exists} (Size: ${size} bytes)`);
    console.log(`  - getCategoryLogo: "${resolvedUrl}" (Matches: ${resolvedUrl === `/${item.file}`})`);
    if (!exists || resolvedUrl !== `/${item.file}`) {
      throw new Error(`Logo verification failed for ${item.name}`);
    }
  }

  console.log('\n=== 2. VERIFYING 130-SCALE EXAM MARK CONVERSION ENGINE ===');
  // Find a student with school records
  const studentWithSchool = await prisma.student.findFirst({
    where: { performanceRecords: { some: { category: { code: 'SCHOOL' } } } },
    include: { performanceRecords: { where: { category: { code: 'SCHOOL' } } } }
  });

  if (!studentWithSchool) {
    console.log('No students found with school records to test.');
    return;
  }

  const profile = await calculateStudentSPR(studentWithSchool.id);
  if (!profile) throw new Error('calculateStudentSPR returned null');

  const schoolSummary = profile.categoryBreakdown?.find(c => c.categoryCode === 'SCHOOL');
  console.log(`Student: ${profile.student.fullName} (${profile.student.studentId})`);
  console.log(`- School Category Earned Points: ${schoolSummary?.earnedPoints} pts`);
  console.log(`- School Raw Input String: "${schoolSummary?.rawInput}"`);
  console.log(`- School Formula String: "${schoolSummary?.formula}"`);
  console.log(`- Overall SPR: ${profile.overallSPR} pts`);

  // Verify manual math matches
  const recs = studentWithSchool.performanceRecords;
  const totObt = recs.reduce((sum, r) => sum + (r.obtainedScore || 0), 0);
  const totMax = recs.reduce((sum, r) => sum + (r.maxScore || 100), 0);
  const expectedPct = (totObt / totMax) * 100;
  const expected130 = Number(((expectedPct / 100) * 130).toFixed(2));

  console.log(`- Verification Math: ${totObt}/${totMax} (${expectedPct.toFixed(2)}%) * 130 = ${expected130}`);
  if (schoolSummary?.earnedPoints !== expected130) {
    throw new Error(`Score mismatch! Expected ${expected130} but got ${schoolSummary?.earnedPoints}`);
  }
  console.log('✅ Student SPR Profile 130-Scale Conversion Verified Successfully!');

  console.log('\n=== 3. VERIFYING SCHOOL STUDIES LEADERBOARD CALCULATION ===');
  const schoolCat = await prisma.category.findUnique({ where: { code: 'SCHOOL' } });
  if (schoolCat) {
    const lb = await calculateAllLeaderboards({ categoryId: schoolCat.id });
    console.log(`Top 5 on School Studies Leaderboard (Converted out of 130 marks):`);
    lb.slice(0, 5).forEach((e, idx) => {
      console.log(`  ${idx + 1}. ${e.name} (${e.className}) — ${e.spr} / 130 pts (Rank #${e.rank})`);
    });
    // Check that top score is <= 130
    if (lb.length > 0 && lb[0].spr > 130) {
      throw new Error(`School leaderboard top score ${lb[0].spr} exceeds 130!`);
    }
  }

  console.log('\n=== ALL VERIFICATIONS PASSED 100% ===');
}

verify().then(() => prisma.$disconnect()).catch(err => {
  console.error('Verification failed:', err);
  prisma.$disconnect();
  process.exit(1);
});
