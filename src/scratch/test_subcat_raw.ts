import { prisma } from '../lib/prisma';

async function testSubcategoryComparison() {
  console.log('Comparing Raw SQL vs Prisma Client for Subcategory:');

  const rawTimes: number[] = [];
  for (let i = 0; i < 5; i++) {
    const s = performance.now();
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM "Subcategory" WHERE "active" = true ORDER BY "displayOrder" ASC`;
    rawTimes.push(performance.now() - s);
  }
  console.log(`Raw SQL Subcategory 5 runs: ${rawTimes.map(t => t.toFixed(1) + 'ms').join(', ')} (Avg: ${(rawTimes.reduce((a,b)=>a+b,0)/rawTimes.length).toFixed(1)}ms)`);

  const prismaTimes: number[] = [];
  for (let i = 0; i < 5; i++) {
    const s = performance.now();
    const rows = await prisma.subcategory.findMany({ where: { active: true }, orderBy: { displayOrder: 'asc' } });
    prismaTimes.push(performance.now() - s);
  }
  console.log(`Prisma Client Subcategory 5 runs: ${prismaTimes.map(t => t.toFixed(1) + 'ms').join(', ')} (Avg: ${(prismaTimes.reduce((a,b)=>a+b,0)/prismaTimes.length).toFixed(1)}ms)`);
}

testSubcategoryComparison().catch(console.error).finally(() => prisma.$disconnect());
