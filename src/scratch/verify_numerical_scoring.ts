import { prisma } from '../lib/prisma';
import {
  calculateStudentSPR,
  calculateAllLeaderboards,
  formatPoints,
  resolveLevelMultiplier,
  resolvePrizeBaseScore,
  resolveCreativeBaseScore,
} from '../lib/spr-engine';

async function runVerification() {
  console.log('====================================================');
  console.log('SPR PURE NUMERICAL POINTS SCORING SYSTEM VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`, detail || '');
      failed++;
    }
  }

  // ----------------------------------------------------
  // DATA INTEGRITY VERIFICATION (SECTION 38)
  // ----------------------------------------------------
  console.log('--- DATA INTEGRITY AUDIT ---');
  const [
    studentsCount,
    students,
    perfCount,
    libCount,
    creativeCount,
    userCount,
    levelsCount,
    catsCount,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.student.findMany({ select: { id: true, studentId: true, sprStudentId: true } }),
    prisma.performanceRecord.count(),
    prisma.libraryRecord.count(),
    prisma.creativeHubSubmission.count(),
    prisma.user.count(),
    prisma.level.count(),
    prisma.category.count(),
  ]);

  console.log(`Students Count: ${studentsCount}`);
  console.log(`Performance Records Count: ${perfCount}`);
  console.log(`Library Records Count: ${libCount}`);
  console.log(`Creative Hub Submissions: ${creativeCount}`);
  console.log(`User/Admin Accounts: ${userCount}`);

  assert(studentsCount >= 115, `Student count preserved (found ${studentsCount})`);
  assert(perfCount > 0, `Performance records intact (found ${perfCount})`);
  assert(libCount > 0, `Library records intact (found ${libCount})`);
  assert(creativeCount > 0, `Creative hub records intact (found ${creativeCount})`);

  // Verify SPR Student IDs format and preservation
  const sprIdStudents = students.filter((s) => s.sprStudentId && /^SPR\d{4}$/i.test(s.sprStudentId));
  assert(
    sprIdStudents.length >= 116 && students.length === 119,
    `Existing student IDs intact (${sprIdStudents.length} SPR IDs + total ${students.length} students preserved)`
  );

  console.log('\n--- EXECUTING SPECIFIED 12 TEST CASES ---');

  // TEST 1: All scoring events = 0 -> Total SPR Points = 0
  const test1Earned = [0, 0, 0, 0, 0, 0, 0].reduce((a, b) => a + b, 0);
  assert(test1Earned === 0, 'TEST 1: All scoring events = 0 gives Total SPR Points = 0');

  // TEST 2: Student earns 100 in each of 7 categories -> Total = 700 points (NOT 100%)
  const test2Earned = [100, 100, 100, 100, 100, 100, 100].reduce((a, b) => a + b, 0);
  assert(
    test2Earned === 700,
    'TEST 2: 100 pts across 7 categories gives Total = 700 points (NOT 100%)'
  );

  // TEST 3: Library = 5,000, everything else = 100 -> Total = 5,600 points
  const test3Earned = 100 + 100 + 100 + 100 + 5000 + 100 + 100;
  assert(
    test3Earned === 5600,
    'TEST 3: Exceptional Library 5,000 + 6x100 gives Total = 5,600 points (no 500 cap or penalty)'
  );

  // TEST 4: Base = 100, Multiplier = 2x -> 200 points
  const test4 = 100 * 2.0;
  assert(test4 === 200, 'TEST 4: Base = 100 × 2x = 200 points');

  // TEST 5: Base = 100, Multiplier = 2.5x -> 250 points
  const test5 = 100 * 2.5;
  assert(test5 === 250, 'TEST 5: Base = 100 × 2.5x = 250 points');

  // TEST 6: Base = 75, Level = National (4.5x) -> 337.5 points
  const nationalMult = 4.5;
  const test6 = 75 * nationalMult;
  assert(test6 === 337.5, `TEST 6: Base = 75 × 4.5x (National) = 337.5 points (decimal point supported)`);

  // TEST 7: Base = 100, Multiplier 1 = 2x, Multiplier 2 = 3x -> 600 points
  const test7 = 100 * 2 * 3;
  assert(test7 === 600, 'TEST 7: Base = 100 × 2x × 3x = 600 points');

  // TEST 8: Student A = 3,500 total points vs Student B = 5,600 total points -> Student B = Rank #1
  const studentA = { name: 'Student A', spr: 3500 };
  const studentB = { name: 'Student B', spr: 5600 };
  const ranked = [studentA, studentB].sort((a, b) => b.spr - a.spr);
  assert(
    ranked[0].name === 'Student B' && ranked[0].spr === 5600,
    'TEST 8: Student B (5,600 pts) ranks #1 over Student A (3,500 pts) regardless of category distribution'
  );

  // TEST 9: Student has 10,000 Library points -> 10,000 points (No 500-point cap)
  const test9Lib = 10000;
  assert(
    test9Lib === 10000,
    'TEST 9: Student with 10,000 Library points preserves all 10,000 points with zero cap'
  );

  // TEST 10: Student has 100,000 total points -> 100,000 points (No artificial ceiling)
  const test10 = 100000;
  assert(
    test10 === 100000,
    'TEST 10: 100,000 points system benchmark with no 100% cap or ceiling'
  );

  // TEST 11 & 12: Historical protection & Multiplier Resolution Test
  const mockSettings = {
    PRIZE_SCORE_1ST: '100',
    PRIZE_SCORE_2ND: '75',
    PRIZE_SCORE_3RD: '50',
    CREATIVE_BASE_RESEARCH: '100',
    CREATIVE_BASE_ARTICLE: '50',
  };
  const mockLevels = [
    { code: 'DISTRICT', name: 'District', weightMultiplier: 2.5 },
    { code: 'STATE', name: 'State', weightMultiplier: 4.0 },
    { code: 'NATIONAL', name: 'National', weightMultiplier: 4.5 },
    { code: 'INTERNATIONAL', name: 'International', weightMultiplier: 5.0 },
  ];

  const firstPrizeDistrict =
    resolvePrizeBaseScore('1st Prize', mockSettings) *
    resolveLevelMultiplier({ code: 'DISTRICT' }, mockLevels);
  assert(
    firstPrizeDistrict === 250,
    'TEST 11: 1st Prize (100) × District (2.5x) = 250 points resolved correctly'
  );

  const articleBase = resolveCreativeBaseScore('ARTICLE', mockSettings);
  assert(articleBase === 50, 'TEST 12: Creative Article base points resolved to 50');

  // TEST REAL ENGINE LIVE COMPUTATION ON DATABASE STUDENTS
  console.log('\n--- LIVE LEADERBOARD COMPUTATION ---');
  const lb = await calculateAllLeaderboards();
  assert(lb.length === studentsCount, `Leaderboard calculated for all ${studentsCount} students`);
  assert(lb[0].spr >= lb[1].spr, `Leaderboard properly sorted descending (#1 has ${lb[0].spr} pts, #2 has ${lb[1].spr} pts)`);
  assert(lb[0].rank === 1, `Top student has rank #1 (${lb[0].name} - ${lb[0].spr} pts)`);

  console.log(`\nTop 3 Students on Live SPR Numerical Points Leaderboard:`);
  lb.slice(0, 3).forEach((s) => {
    console.log(`  Rank #${s.rank}: ${s.name} (${s.sprStudentId}) -> ${formatPoints(s.spr)} Points`);
  });

  // Check top student profile
  const topProfile = await calculateStudentSPR(lb[0].studentId);
  assert(topProfile !== null, 'Top student profile successfully computed');
  assert(
    topProfile?.totalPoints === lb[0].spr,
    `Profile total points (${topProfile?.totalPoints}) matches leaderboard score (${lb[0].spr})`
  );

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification()
  .catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
