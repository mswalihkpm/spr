import { prisma } from '../lib/prisma';

async function main() {
  const litCategory = await prisma.category.findUnique({
    where: { code: 'LITERARY' },
    include: { subcategories: true },
  });
  console.log('LITERARY CATEGORY:', JSON.stringify(litCategory, null, 2));

  const litEvents = await prisma.literaryEvent.findMany({
    include: { competitions: true },
  });
  console.log('LITERARY EVENTS COUNT:', litEvents.length);
  console.log('LITERARY EVENTS:', JSON.stringify(litEvents, null, 2));

  const litRecords = await prisma.performanceRecord.findMany({
    where: { category: { code: 'LITERARY' } },
    include: {
      student: true,
      subcategory: true,
      literaryCompetition: { include: { event: true } },
      level: true,
    },
    take: 20,
  });
  console.log('LITERARY RECORDS COUNT:', litRecords.length);
  console.log('LITERARY RECORDS SAMPLE:', JSON.stringify(litRecords, null, 2));
}

main().finally(() => prisma.$disconnect());
