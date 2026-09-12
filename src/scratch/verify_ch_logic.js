const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const chCat = await prisma.category.findFirst({ where: { code: 'CREATIVE_HUB' } });
  console.log('Category CREATIVE_HUB ID:', chCat.id);

  // Import calculateAllLeaderboards via compiled bundle or direct test
  const students = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    include: {
      class: true,
      school: true,
      performanceRecords: {
        include: {
          category: true,
          subcategory: true,
          level: true,
        },
      },
      creativeWorks: {
        include: {
          category: true,
        },
      },
      libraryRecords: true,
    },
  });

  const studentsWithWorks = students.filter(s => s.creativeWorks.length > 0);
  console.log(`Found ${studentsWithWorks.length} active students with Creative Hub works in DB.`);
  studentsWithWorks.forEach(s => {
    let totalScore = 0;
    s.creativeWorks.forEach(w => {
      totalScore += (w.score || w.category?.weight || 20);
    });
    console.log(`- ${s.fullName} (${s.studentId}): ${totalScore} pts from ${s.creativeWorks.length} work(s)`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
