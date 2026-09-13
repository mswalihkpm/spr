import { prisma } from '../lib/prisma';
import {
  getCachedCategories,
  getCachedSettings,
  getCachedLevels,
  invalidateEngineCache,
} from '../lib/spr-engine';

async function testCombinedOptimization() {
  console.log('========================================================================');
  console.log('       COMBINED CONFIGURATION DATASETS BENCHMARK                        ');
  console.log('========================================================================\n');

  // Baseline: Current implementation (Sequential cold load with Base64 in Subcategory)
  const baselineTimes: number[] = [];
  for (let i = 0; i < 5; i++) {
    invalidateEngineCache();
    const s = performance.now();
    await getCachedCategories();
    await getCachedSettings();
    await getCachedLevels();
    baselineTimes.push(performance.now() - s);
  }
  const avgBaseline = baselineTimes.reduce((a, b) => a + b, 0) / baselineTimes.length;
  console.log(`1. Current Baseline (Sequential with 3.69MB Base64 Subcategory): Avg = ${avgBaseline.toFixed(1)} ms (${baselineTimes.map(t => t.toFixed(0) + 'ms').join(', ')})`);

  // Option A: Parallel (Promise.all) with current Base64 Subcategory
  const parWithLogoTimes: number[] = [];
  for (let i = 0; i < 5; i++) {
    invalidateEngineCache();
    const s = performance.now();
    await Promise.all([
      getCachedCategories(),
      getCachedSettings(),
      getCachedLevels(),
    ]);
    parWithLogoTimes.push(performance.now() - s);
  }
  const avgParWithLogo = parWithLogoTimes.reduce((a, b) => a + b, 0) / parWithLogoTimes.length;
  console.log(`2. Parallel Promise.all (with 3.69MB Base64 Subcategory): Avg = ${avgParWithLogo.toFixed(1)} ms (${parWithLogoTimes.map(t => t.toFixed(0) + 'ms').join(', ')})`);

  // Option B: Sequential without Base64 Subcategory
  const seqWithoutLogoTimes: number[] = [];
  for (let i = 0; i < 5; i++) {
    const s = performance.now();
    await prisma.category.findMany({
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
    await prisma.systemSetting.findMany();
    await prisma.level.findMany({ where: { active: true }, orderBy: { displayOrder: 'asc' } });
    seqWithoutLogoTimes.push(performance.now() - s);
  }
  const avgSeqWithoutLogo = seqWithoutLogoTimes.reduce((a, b) => a + b, 0) / seqWithoutLogoTimes.length;
  console.log(`3. Sequential without Base64 Subcategory: Avg = ${avgSeqWithoutLogo.toFixed(1)} ms (${seqWithoutLogoTimes.map(t => t.toFixed(0) + 'ms').join(', ')})`);

  // Option C: Parallel Promise.all without Base64 Subcategory
  const parWithoutLogoTimes: number[] = [];
  for (let i = 0; i < 5; i++) {
    const s = performance.now();
    await Promise.all([
      prisma.category.findMany({
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
      }),
      prisma.systemSetting.findMany(),
      prisma.level.findMany({ where: { active: true }, orderBy: { displayOrder: 'asc' } }),
    ]);
    parWithoutLogoTimes.push(performance.now() - s);
  }
  const avgParWithoutLogo = parWithoutLogoTimes.reduce((a, b) => a + b, 0) / parWithoutLogoTimes.length;
  console.log(`4. Parallel Promise.all without Base64 Subcategory: Avg = ${avgParWithoutLogo.toFixed(1)} ms (${parWithoutLogoTimes.map(t => t.toFixed(0) + 'ms').join(', ')})`);

  // Option D: Unified single-query fetch (fetching Category, CategoryWeight, Subcategory, SystemSetting, Level)
  const unifiedTimes: number[] = [];
  for (let i = 0; i < 5; i++) {
    const s = performance.now();
    const [cats, weights, subcats, settings, levels] = await Promise.all([
      prisma.category.findMany({ where: { active: true }, orderBy: { displayOrder: 'asc' } }),
      prisma.categoryWeight.findMany({ where: { isActive: true } }),
      prisma.subcategory.findMany({
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
      }),
      prisma.systemSetting.findMany(),
      prisma.level.findMany({ where: { active: true }, orderBy: { displayOrder: 'asc' } }),
    ]);
    unifiedTimes.push(performance.now() - s);
  }
  const avgUnified = unifiedTimes.reduce((a, b) => a + b, 0) / unifiedTimes.length;
  console.log(`5. Flat Parallel Fetch (all 5 tables concurrently): Avg = ${avgUnified.toFixed(1)} ms (${unifiedTimes.map(t => t.toFixed(0) + 'ms').join(', ')})`);

  console.log('\n--- SUMMARY OF SAVINGS ---');
  console.log(`Current Cold Load: ${avgBaseline.toFixed(1)} ms`);
  console.log(`Optimized Cold Load (Option C - Parallel Promise.all with lightweight Subcategory): ${avgParWithoutLogo.toFixed(1)} ms`);
  console.log(`Expected Latency Reduction: ${(avgBaseline - avgParWithoutLogo).toFixed(1)} ms saved (~${(avgBaseline / avgParWithoutLogo).toFixed(1)}x speedup)`);
}

testCombinedOptimization().catch(console.error).finally(() => prisma.$disconnect());
