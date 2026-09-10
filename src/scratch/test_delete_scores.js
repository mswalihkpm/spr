const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBulkDelete() {
  // Find an exam or category
  const cat = await prisma.category.findUnique({ where: { code: 'ISLAMIC' } });
  const records = await prisma.performanceRecord.findMany({
    where: { categoryId: cat.id },
    take: 5,
  });

  console.log(`Found ${records.length} sample Islamic records to test.`);
  if (records.length > 0) {
    const ids = records.map(r => r.id);
    const deleteRes = await prisma.performanceRecord.deleteMany({
      where: { id: { in: ids } }
    });
    console.log(`Deleted ${deleteRes.count} records successfully.`);
  }
}

testBulkDelete().catch(console.error).finally(() => prisma.$disconnect());
