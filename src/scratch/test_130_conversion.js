const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const students = await prisma.student.findMany({
    where: { performanceRecords: { some: { category: { code: 'SCHOOL' } } } },
    include: {
      performanceRecords: {
        where: { category: { code: 'SCHOOL' } },
        include: { subject: true, exam: true }
      }
    },
    take: 5
  });

  for (const s of students) {
    const recs = s.performanceRecords;
    const totalObtained = recs.reduce((acc, r) => acc + (r.obtainedScore || 0), 0);
    const totalMax = recs.reduce((acc, r) => acc + (r.maxScore || 100), 0);
    const pct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const scoreOut130 = Number(((pct / 100) * 130).toFixed(2));

    console.log(`Student: ${s.fullName}`);
    console.log(`- Subjects count: ${recs.length}`);
    console.log(`- Raw total marks: ${totalObtained} / ${totalMax}`);
    console.log(`- Percentage: ${pct.toFixed(2)}%`);
    console.log(`- Converted to 130 mark: ${scoreOut130} pts (out of 130)\n`);
  }
}

check().then(() => prisma.$disconnect()).catch(err => {
  console.error(err);
  prisma.$disconnect();
});
