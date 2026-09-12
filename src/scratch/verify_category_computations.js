const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany();
  console.log('--- Testing Category Leaderboard Computations ---');
  for (const cat of categories) {
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
          }
        },
        creativeWorks: {
          include: {
            category: true,
          }
        },
        libraryRecords: true,
      }
    });

    let withPoints = 0;
    students.forEach(s => {
      let score = 0;
      if (cat.code === 'CREATIVE_HUB') {
        score = s.creativeWorks.reduce((sum, w) => sum + (w.score || 20), 0);
      } else if (cat.code === 'LIBRARY') {
        const libScore = s.libraryRecords.reduce((sum, l) => sum + (l.readingScore || 0), 0);
        const perfScore = s.performanceRecords.filter(r => r.categoryId === cat.id).reduce((sum, r) => sum + (r.obtainedScore || 0), 0);
        score = libScore + perfScore;
      } else {
        score = s.performanceRecords.filter(r => r.categoryId === cat.id).reduce((sum, r) => sum + (r.obtainedScore || 0), 0);
      }
      if (score > 0) withPoints++;
    });
    console.log(`✅ Category [${cat.code}] "${cat.name}": ${withPoints} students scored`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
