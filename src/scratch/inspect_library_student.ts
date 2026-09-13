import { prisma } from '../lib/prisma';
import { calculateStudentSPR, calculateAllLeaderboards } from '../lib/spr-engine';

async function main() {
  console.log('--- Categories in DB ---');
  const categories = await prisma.category.findMany({
    include: { categoryWeights: true, subcategories: true },
  });
  for (const c of categories) {
    console.log(`Cat: ${c.code} (${c.name}), defaultWeight: ${c.defaultWeight}, weights:`, c.categoryWeights);
  }

  console.log('--- Students with Library records or Kuthbkhana ---');
  const libRecords = await prisma.libraryRecord.findMany({
    take: 10,
    include: { student: true },
  });
  console.log('Library records sample:', libRecords.map(l => ({ student: l.student?.fullName, id: l.studentId, score: l.readingScore, books: l.booksRead })));

  const studentsWith140 = await prisma.libraryRecord.findMany({
    where: { readingScore: 140 },
    include: { student: true },
  });
  console.log('Students with 140 readingScore:', studentsWith140.map(l => ({ name: l.student?.fullName, id: l.student?.id })));

  const perfWith140 = await prisma.performanceRecord.findMany({
    where: {
      OR: [
        { obtainedScore: 140 },
        { category: { code: 'LIBRARY' } }
      ]
    },
    include: { student: true, category: true, subcategory: true },
  });
  console.log('Perf records for LIBRARY or 140 pts:', perfWith140.map(p => ({ student: p.student?.fullName, id: p.studentId, cat: p.category.code, score: p.obtainedScore })));

  const allStudents = await prisma.student.findMany({
    include: { libraryRecords: true, performanceRecords: { where: { category: { code: 'LIBRARY' } } } }
  });
  const studentsWithLib = allStudents.filter(s => s.libraryRecords.length > 0 || s.performanceRecords.length > 0);
  console.log(`Found ${studentsWithLib.length} students with Library records.`);
  for (const st of studentsWithLib.slice(0, 5)) {
    console.log(`Student: ${st.fullName} (${st.id})`);
    const prof = await calculateStudentSPR(st.id);
    console.log(`  Overall SPR: ${prof?.overallSPR}`);
    const libCat = prof?.categoryScores?.find(c => c.categoryCode === 'LIBRARY');
    console.log(`  Library Cat:`, libCat ? { earned: libCat.earnedPoints, pct: libCat.percentage, score: libCat.score, weighted: libCat.weightedContribution } : 'None');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
