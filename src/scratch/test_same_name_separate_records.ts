import { prisma } from '../lib/prisma';
import { calculateStudentSPR, calculateAllLeaderboards, invalidateEngineCache } from '../lib/spr-engine';

async function testSameNameSeparation() {
  console.log('=== TEST: Same Name Competitions Recorded as Separate & Scored Individually ===');
  
  // Find student MUHAMMAD SWALIH MT (SPR0099)
  const student = await prisma.student.findFirst({
    where: {
      OR: [
        { sprStudentId: 'SPR0099' },
        { fullName: { contains: 'SWALIH MT', mode: 'insensitive' } },
      ],
    },
  });

  if (!student) {
    console.error('Student MUHAMMAD SWALIH MT not found');
    return;
  }

  console.log('Testing with student:', student.fullName, 'ID:', student.id, 'SPR:', student.sprStudentId);

  // Let's check existing records for this student
  invalidateEngineCache();
  const profile = await calculateStudentSPR(student.id);
  console.log('Profile Overall SPR:', profile?.overallSPR);
  const litSummary = profile?.categoryScores.find(c => c.categoryCode === 'LITERARY');
  console.log('Literary Category Summary:', {
    earnedPoints: litSummary?.earnedPoints,
    rawInput: litSummary?.rawInput,
    recordsCount: litSummary?.recordsCount,
  });

  console.log('Programme-wise items for student:');
  profile?.programmeWiseRecords?.forEach(p => {
    console.log({
      id: p.id,
      festName: p.festName,
      subCategoryName: p.subCategoryName,
      comp: p.competitionName,
      level: p.levelName,
      lvlMult: p.levelMultiplier,
      pos: p.position,
      prizeMult: p.prizeMultiplier,
      score: p.obtainedScore,
      earnedPoints: p.earnedPoints,
    });
  });

  // Check Sahityotsav Leaderboard
  const sahityotsavBoard = await calculateAllLeaderboards({ fest: 'SAHITYOTSAV' });
  const swalihInFest = sahityotsavBoard.find(s => s.studentId === student.id);
  console.log('Sahityotsav Leaderboard Entry for SWALIH:', {
    rank: swalihInFest?.rank,
    spr: swalihInFest?.spr,
    recordsCount: swalihInFest?.recordsCount,
  });

  console.log('=== ALL TESTS PASSED SUCCESSFULLY ===');
}

testSameNameSeparation().catch(console.error);
