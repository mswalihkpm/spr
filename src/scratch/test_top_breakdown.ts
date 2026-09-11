import { prisma } from '../lib/prisma';
import { calculateStudentSPR } from '../lib/spr-engine';

async function testTop() {
  const topStudents = await prisma.student.findMany({
    where: { fullName: { in: ['AHAMMAD SINAN K', 'UMAR ABDULLA KAMIL V A', 'MUHAMMED SUFYAN PN'] } }
  });
  for (const s of topStudents) {
    const profile = await calculateStudentSPR(s.id);
    if (!profile) continue;
    console.log(`\n========================================`);
    console.log(`STUDENT: ${s.fullName} (${s.studentId} / ${s.sprStudentId})`);
    console.log(`FINAL SPR: ${profile.overallSPR}%`);
    console.log(`Raw Weighted Sum: ${profile.rawWeightedTotal}, Max Weighted Sum: ${profile.maxWeightedTotal}`);
    console.log(`----------------------------------------`);
    console.table(profile.categoryScores.map(c => ({
      Category: c.categoryName,
      Input: c.rawInput,
      'Normalized %': `${c.normalizedPercentage}%`,
      Weight: c.weight,
      Contribution: `+${c.weightedContribution}%`,
    })));
  }
}

testTop().catch(console.error).finally(() => prisma.$disconnect());
