const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany({
    include: {
      categoryWeights: true,
      subcategories: true,
    },
    orderBy: { displayOrder: 'asc' },
  });

  console.log('=== CATEGORIES IN DB ===');
  categories.forEach((c) => {
    console.log(`- ${c.code} (${c.name}): defaultWeight=${c.defaultWeight}, displayOrder=${c.displayOrder}, weights=${JSON.stringify(c.categoryWeights)}`);
  });

  const creativeCategories = await prisma.creativeHubCategory.findMany({
    orderBy: { displayOrder: 'asc' },
  });

  console.log('=== CREATIVE HUB CATEGORIES IN DB ===');
  creativeCategories.forEach((cc) => {
    console.log(`- ${cc.code} (${cc.name}): displayOrder=${cc.displayOrder}, weight=${cc.weight}, active=${cc.active}`);
  });

  const levels = await prisma.level.findMany({
    orderBy: { displayOrder: 'asc' },
  });

  console.log('=== LEVELS IN DB ===');
  levels.forEach((l) => {
    console.log(`- ${l.code} (${l.name}): multiplier=${l.weightMultiplier}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
