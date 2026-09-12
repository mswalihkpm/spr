const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testLeaderboard() {
  const students = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    include: {
      performanceRecords: {
        include: { category: true, exam: true, subject: true }
      }
    }
  });

  const entries = [];
  for (const s of students) {
    const schoolRecords = s.performanceRecords.filter(r => r.category?.code === 'SCHOOL');
    if (schoolRecords.length === 0) continue;

    const totObt = schoolRecords.reduce((sum, r) => sum + (r.obtainedScore || 0), 0);
    const totMax = schoolRecords.reduce((sum, r) => sum + (r.maxScore || 100), 0);
    const pct = totMax > 0 ? (totObt / totMax) * 100 : 0;
    const score130 = Number(((pct / 100) * 130).toFixed(2));

    entries.push({
      name: s.fullName,
      studentId: s.studentId,
      totObt,
      totMax,
      pct: pct.toFixed(2) + '%',
      score130
    });
  }

  entries.sort((a, b) => b.score130 - a.score130);
  console.log(`Top 10 School Studies Leaderboard (Converted % to 130 mark):`);
  entries.slice(0, 10).forEach((e, idx) => {
    console.log(`${idx + 1}. ${e.name} (${e.studentId}): ${e.totObt}/${e.totMax} (${e.pct}) => ${e.score130} / 130 pts`);
  });
}

testLeaderboard().then(() => prisma.$disconnect()).catch(err => {
  console.error(err);
  prisma.$disconnect();
});
