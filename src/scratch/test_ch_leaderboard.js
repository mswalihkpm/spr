const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const chCat = await prisma.category.findFirst({ where: { code: 'CREATIVE_HUB' } });
  console.log('CH Cat ID:', chCat.id);

  // Let's test how students and their creativeWorks are loaded in calculateAllLeaderboards
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

  const studentsWithCreativeWorks = students.filter(s => s.creativeWorks.length > 0);
  console.log('Students with creativeWorks in DB:', studentsWithCreativeWorks.length);
  studentsWithCreativeWorks.slice(0, 5).forEach(s => {
    console.log(`Student ${s.fullName} (${s.studentId}): ${s.creativeWorks.length} works`);
    s.creativeWorks.forEach(w => {
      console.log(`   - ${w.title} / score=${w.score} / cat=${w.category?.name} / status=${w.publicationStatus}`);
    });
  });

  // Check how categoryPoints is calculated in calculateAllLeaderboards:
  // student.creativeWorks.forEach((w) => {
  //   const rawScore = typeof w.score === 'number' && w.score > 0
  //     ? w.score
  //     : (typeof w.category?.weight === 'number' && w.category.weight > 0 ? w.category.weight : 20);
  //   catEarned += rawScore;
  // });
}

main().catch(console.error).finally(() => prisma.$disconnect());
