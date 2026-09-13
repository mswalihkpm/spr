import { prisma } from '../lib/prisma';

async function testOmitLogoUrl() {
  console.log('Comparing getCachedCategories with SELECT (no logoUrl) vs INCLUDE (with 3.69MB Base64 logoUrl):');

  // 1. Current findMany with include (downloads 3.69MB)
  const timesWithLogo: number[] = [];
  for (let i = 0; i < 5; i++) {
    const s = performance.now();
    const cats = await prisma.category.findMany({
      where: { active: true },
      include: {
        categoryWeights: true,
        subcategories: {
          where: { active: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
    timesWithLogo.push(performance.now() - s);
  }
  const avgWith = timesWithLogo.reduce((a, b) => a + b, 0) / timesWithLogo.length;
  console.log(`With Base64 logoUrl (3.69 MB payload): Avg = ${avgWith.toFixed(1)} ms (${timesWithLogo.map(t => t.toFixed(0) + 'ms').join(', ')})`);

  // 2. findMany with select omitting logoUrl (downloads < 5 KB)
  const timesWithoutLogo: number[] = [];
  for (let i = 0; i < 5; i++) {
    const s = performance.now();
    const cats = await prisma.category.findMany({
      where: { active: true },
      include: {
        categoryWeights: true,
        subcategories: {
          where: { active: true },
          select: {
            id: true,
            categoryId: true,
            name: true,
            code: true,
            hasLevels: true,
            levelGroup: true,
            allowedLevelIds: true,
            hasMaxScore: true,
            maxScore: true,
            weight: true,
            displayOrder: true,
            active: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
    timesWithoutLogo.push(performance.now() - s);
  }
  const avgWithout = timesWithoutLogo.reduce((a, b) => a + b, 0) / timesWithoutLogo.length;
  console.log(`Without Base64 logoUrl (4.8 KB payload): Avg = ${avgWithout.toFixed(1)} ms (${timesWithoutLogo.map(t => t.toFixed(0) + 'ms').join(', ')})`);

  console.log(`\nLatency Reduction for getCachedCategories: ${(avgWith - avgWithout).toFixed(1)} ms saved (~${(avgWith / avgWithout).toFixed(1)}x faster!)`);
}

testOmitLogoUrl().catch(console.error).finally(() => prisma.$disconnect());
