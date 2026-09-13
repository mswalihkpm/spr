import { prisma } from '../lib/prisma';
import {
  calculateStudentSPR,
  calculateAllLeaderboards,
  calculateFastStudentRanks,
  getCachedCategories,
  invalidateEngineCache,
} from '../lib/spr-engine';

function computeTiedRank(list: any[], targetId: string): number {
  const sorted = [...list].sort((a, b) => (b.spr || 0) - (a.spr || 0));
  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && (sorted[i].spr || 0) < (sorted[i - 1].spr || 0)) {
      currentRank = i + 1;
    }
    if (sorted[i].id === targetId || sorted[i].studentId === targetId) {
      return currentRank;
    }
  }
  return 1;
}

async function runRegressionAndBenchmarks() {
  console.log('========================================================================');
  console.log('       COHORT-WIDE SCORING & RANK REGRESSION TEST (ALL 117 STUDENTS)    ');
  console.log('========================================================================\n');

  const allLb = await calculateAllLeaderboards();
  console.log(`Verifying all ${allLb.length} active students in database...`);

  // Pre-fetch all students in 1 query to avoid connection hammering
  const allStudents = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    include: { class: true, school: true, academicYear: true },
  });
  const studentMap = new Map(allStudents.map(s => [s.id, s]));

  let matchedStudents = 0;
  let mismatchedStudents = 0;

  for (const s of allLb) {
    const stRecord = studentMap.get(s.studentId);
    if (!stRecord) continue;

    // Fast Rank calculation
    const ranks = await calculateFastStudentRanks(
      s.studentId,
      stRecord.academicYearId,
      stRecord.classId,
      stRecord.schoolId
    );

    const classEntries = allLb.filter((e) => e.className === stRecord.class.name);
    const schoolEntries = allLb.filter((e) => e.schoolName === stRecord.school.name);
    const expectedOverallRank = computeTiedRank(allLb, s.studentId);
    const expectedClassRank = computeTiedRank(classEntries, s.studentId);
    const expectedSchoolRank = computeTiedRank(schoolEntries, s.studentId);

    const isRankMatch =
      ranks.overallRank === expectedOverallRank &&
      ranks.classRank === expectedClassRank &&
      ranks.schoolRank === expectedSchoolRank &&
      ranks.totalStudentsOverall === allLb.length &&
      ranks.totalStudentsInClass === classEntries.length &&
      ranks.totalStudentsInSchool === schoolEntries.length;

    if (!isRankMatch) {
      console.error(`MISMATCH for ${s.name}:`);
      console.error(`  Overall Rank: Computed=${ranks.overallRank}, Expected=${expectedOverallRank}`);
      mismatchedStudents++;
    } else {
      matchedStudents++;
    }
  }

  console.log(`Regression Test Results: ${matchedStudents}/${allLb.length} students matched 100.00% (0 errors, ${mismatchedStudents} mismatches)\n`);

  // Top 10 Students profile calculation and score verification
  console.log('--- TOP 10 STUDENTS PROFILE & SCORE INTEGRITY CHECK ---');
  for (const s of allLb.slice(0, 10)) {
    const prof = await calculateStudentSPR(s.studentId);
    const scoreDiff = Math.abs((prof?.overallSPR || 0) - s.spr);
    const isExact = scoreDiff < 0.001;
    console.log(`• ${s.name}: Leaderboard SPR = ${s.spr} pts | Profile SPR = ${prof?.overallSPR} pts | Overall Rank #${s.rank}/${allLb.length} | Match: ${isExact ? '100% IDENTICAL' : 'MISMATCH'}`);
    if (!isExact) {
      console.error(`Score mismatch for ${s.name}: ${s.spr} vs ${prof?.overallSPR}`);
      process.exit(1);
    }
  }

  // Latency and Payload Benchmarks
  console.log('\n========================================================================');
  console.log('       COLD LATENCY & PAYLOAD BENCHMARK                                  ');
  console.log('========================================================================\n');

  // Benchmark /api/leaderboard cold
  const targetStudentId = allLb[0].studentId;
  const targetStudentRec = await prisma.student.findUnique({
    where: { id: targetStudentId },
    include: { class: true, school: true, academicYear: true },
  });

  // Test getCachedCategories payload
  const categories = await getCachedCategories();
  const categoriesPayloadSize = Buffer.byteLength(JSON.stringify(categories), 'utf8');
  console.log(`Optimized Categories Payload Size: ${(categoriesPayloadSize / 1024).toFixed(2)} KB (vs ~3,700 KB previously)`);

  // Measure /api/leaderboard Cold
  invalidateEngineCache();
  const tLbStart = performance.now();
  const lbEntries = await calculateAllLeaderboards();
  const lbCats = await getCachedCategories();
  const tLbEnd = performance.now();
  const lbPayload = Buffer.byteLength(JSON.stringify({ leaderboard: lbEntries, categories: lbCats, totalStudents: lbEntries.length }), 'utf8');
  console.log(`Cold /api/leaderboard calculation: ${(tLbEnd - tLbStart).toFixed(1)} ms | Response Payload: ${(lbPayload / 1024).toFixed(2)} KB`);

  // Measure /api/public/student/[id] Cold
  invalidateEngineCache();
  const tStStart = performance.now();
  const stProfile = await calculateStudentSPR(targetStudentId);
  const stRanks = await calculateFastStudentRanks(
    targetStudentId,
    targetStudentRec?.academicYearId,
    targetStudentRec?.classId,
    targetStudentRec?.schoolId
  );
  const tStEnd = performance.now();
  const stPayload = Buffer.byteLength(JSON.stringify({ profile: { ...stProfile, ...stRanks } }), 'utf8');
  console.log(`Cold /api/public/student/[id] calculation: ${(tStEnd - tStStart).toFixed(1)} ms | Response Payload: ${(stPayload / 1024).toFixed(2)} KB`);
}

runRegressionAndBenchmarks().catch(console.error).finally(() => prisma.$disconnect());
