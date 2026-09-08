const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const deleted = await prisma.categoryWeight.deleteMany({ where: { weight: 0 } });
  console.log('Deleted 0-weight category weights:', deleted);

  const categories = await prisma.category.findMany({
    include: { categoryWeights: true },
    orderBy: { displayOrder: 'asc' },
  });

  console.log('Categories and weights:');
  categories.forEach((c) => {
    console.log(`- ${c.name} (${c.code}): defaultWeight=${c.defaultWeight}, weights=${JSON.stringify(c.categoryWeights)}`);
  });
}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
