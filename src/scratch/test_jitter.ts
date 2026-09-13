import { prisma } from '../lib/prisma';

async function testJitter() {
  console.log('Testing 10 sequential runs of Subcategory vs Category:');
  const subcatTimes: number[] = [];
  for (let i = 0; i < 10; i++) {
    const s = performance.now();
    await prisma.subcategory.findMany({ where: { active: true }, orderBy: { displayOrder: 'asc' } });
    subcatTimes.push(performance.now() - s);
  }
  console.log(`Subcategory 10 runs: ${subcatTimes.map(t => t.toFixed(1) + 'ms').join(', ')}`);
  console.log(`Subcategory Avg: ${(subcatTimes.reduce((a, b) => a + b, 0) / subcatTimes.length).toFixed(1)} ms`);

  const catTimes: number[] = [];
  for (let i = 0; i < 10; i++) {
    const s = performance.now();
    await prisma.category.findMany({ where: { active: true }, orderBy: { displayOrder: 'asc' } });
    catTimes.push(performance.now() - s);
  }
  console.log(`Category 10 runs: ${catTimes.map(t => t.toFixed(1) + 'ms').join(', ')}`);
  console.log(`Category Avg: ${(catTimes.reduce((a, b) => a + b, 0) / catTimes.length).toFixed(1)} ms`);
}

testJitter().catch(console.error).finally(() => prisma.$disconnect());
