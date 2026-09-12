const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const chCat = await prisma.category.findFirst({ where: { code: 'CREATIVE_HUB' } });
  console.log('Category CREATIVE_HUB in DB:', chCat);

  const chSubmissions = await prisma.creativeHubSubmission.findMany({
    include: { student: true, category: true }
  });
  console.log('Total Creative Hub Submissions in DB:', chSubmissions.length);
  if (chSubmissions.length > 0) {
    console.log('Sample submission:', chSubmissions[0]);
  }

  const allCategories = await prisma.category.findMany();
  console.log('All Categories in DB:', allCategories.map(c => ({ id: c.id, code: c.code, name: c.name, defaultWeight: c.defaultWeight })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
