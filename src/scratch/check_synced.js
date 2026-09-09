const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUnmatched() {
  const records = await prisma.libraryRecord.findMany({
    include: { student: { include: { class: true, school: true } } },
    orderBy: { readingRank: 'asc' }
  });

  console.log(`Current Library Records in SPR DB: ${records.length}`);
  records.forEach(r => {
    console.log(`Rank #${r.readingRank}: ${r.student.fullName} (${r.student.class.name}) - ${r.readingScore} pts, ${r.booksRead} books`);
  });
}

checkUnmatched().finally(() => prisma.$disconnect());
