const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSavedRecords() {
  const records = await prisma.libraryRecord.findMany({
    include: {
      student: {
        include: {
          class: true,
          school: true,
        },
      },
    },
    orderBy: [
      { readingRank: 'asc' },
      { readingScore: 'desc' },
      { booksRead: 'desc' },
    ],
  });

  console.log(`Total saved library records in DB: ${records.length}`);
  console.log('\n--- TOP 10 STANDINGS IN SPR ---');
  records.slice(0, 10).forEach((r) => {
    console.log(`Rank #${r.readingRank}: ${r.student?.fullName} (${r.student?.class?.name || 'Class'}) - ${r.readingScore} pts | ${r.booksRead} books`);
  });
}

checkSavedRecords().catch(console.error).finally(() => prisma.$disconnect());
