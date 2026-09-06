const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const years = await prisma.academicYear.findMany({ include: { terms: true } });
  console.log('Academic Years:', years);

  const terms = await prisma.term.findMany();
  console.log('Terms:', terms);
}

check().catch(console.error).finally(() => prisma.$disconnect());
