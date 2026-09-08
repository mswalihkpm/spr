const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testLeaderboard() {
  const scores = await prisma.performanceRecord.findMany({
    include: { student: true, category: true, subcategory: true, level: true },
  });
  console.log(`Total performance records in DB: ${scores.length}`);
  scores.forEach((s) => {
    console.log(`- Student: ${s.student?.fullName}, Category: ${s.category?.name}, Subcategory: ${s.subcategory?.name}, Score: ${s.obtainedScore}/${s.maxScore} (${s.percentage}%), Level: ${s.level?.name}`);
  });
}

testLeaderboard()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
