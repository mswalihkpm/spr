const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const levels = await p.level.findMany({ orderBy: { displayOrder: 'asc' } });
  console.log('--- LEVELS ---');
  levels.forEach(l => console.log(`${l.name} (${l.code}): multiplier=${l.weightMultiplier}, order=${l.displayOrder}, active=${l.active}`));

  const cats = await p.category.findMany({ orderBy: { displayOrder: 'asc' } });
  console.log('\n--- CATEGORIES ---');
  cats.forEach(c => console.log(`${c.name} (${c.code}): order=${c.displayOrder}, defaultWeight=${c.defaultWeight}, active=${c.active}, includeInSPR=${c.includeInSPR}`));

  const catWeights = await p.categoryWeight.findMany({ include: { category: true } });
  console.log('\n--- CATEGORY WEIGHTS ---');
  catWeights.forEach(cw => console.log(`${cw.category.name} (${cw.category.code}): weight=${cw.weight}, isActive=${cw.isActive}, isIncluded=${cw.isIncludedInSPR}`));

  const chCats = await p.creativeHubCategory.findMany({ orderBy: { createdAt: 'asc' } });
  console.log('\n--- CREATIVE HUB CATEGORIES ---');
  chCats.forEach(ch => console.log(`${ch.name} (${ch.code}): weight=${ch.weight}, active=${ch.active}`));

  const subcats = await p.subcategory.findMany({ include: { category: true } });
  console.log('\n--- SUBCATEGORIES ---');
  subcats.forEach(sc => console.log(`[${sc.category.name}] ${sc.name} (${sc.code}): weight=${sc.weight}, maxScore=${sc.maxScore}, active=${sc.active}`));
}

main().catch(console.error).finally(() => p.$disconnect());
