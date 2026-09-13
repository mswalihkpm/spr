import { prisma } from '../lib/prisma';
import {
  getCachedCategories,
  getCachedSettings,
  getCachedLevels,
  getCachedCreativeCategories,
  invalidateEngineCache,
} from '../lib/spr-engine';

async function diagnose() {
  console.log('========================================================================');
  console.log('       DIAGNOSIS: getCachedCategories, getCachedSettings, getCachedLevels ');
  console.log('========================================================================\n');

  // 1. Measure getCachedSettings() isolated
  invalidateEngineCache();
  const t0 = performance.now();
  const settings = await prisma.systemSetting.findMany();
  const t1 = performance.now();
  console.log(`1. prisma.systemSetting.findMany(): ${(t1 - t0).toFixed(2)} ms (${settings.length} records)`);

  // 2. Measure getCachedLevels() isolated
  invalidateEngineCache();
  const t2 = performance.now();
  const levels = await prisma.level.findMany({
    where: { active: true },
    orderBy: { displayOrder: 'asc' },
  });
  const t3 = performance.now();
  console.log(`2. prisma.level.findMany(): ${(t3 - t2).toFixed(2)} ms (${levels.length} records)`);

  // 3. Measure getCachedCreativeCategories() isolated
  invalidateEngineCache();
  const t4 = performance.now();
  const creativeCats = await prisma.creativeHubCategory.findMany({
    where: { active: true },
    orderBy: { displayOrder: 'asc' },
  });
  const t5 = performance.now();
  console.log(`3. prisma.creativeHubCategory.findMany(): ${(t5 - t4).toFixed(2)} ms (${creativeCats.length} records)`);

  // 4. Measure getCachedCategories() breakdown:
  // A. Category table alone
  const t6 = performance.now();
  const catsAlone = await prisma.category.findMany({
    where: { active: true },
    orderBy: { displayOrder: 'asc' },
  });
  const t7 = performance.now();
  console.log(`4a. prisma.category.findMany() (without include): ${(t7 - t6).toFixed(2)} ms (${catsAlone.length} records)`);

  // B. CategoryWeight table alone
  const t8 = performance.now();
  const weightsAlone = await prisma.categoryWeight.findMany({
    where: { categoryId: { in: catsAlone.map((c) => c.id) } },
  });
  const t9 = performance.now();
  console.log(`4b. prisma.categoryWeight.findMany() (subquery): ${(t9 - t8).toFixed(2)} ms (${weightsAlone.length} records)`);

  // C. Subcategory table alone
  const t10 = performance.now();
  const subcatsAlone = await prisma.subcategory.findMany({
    where: { active: true, categoryId: { in: catsAlone.map((c) => c.id) } },
    orderBy: { displayOrder: 'asc' },
  });
  const t11 = performance.now();
  console.log(`4c. prisma.subcategory.findMany() (subquery): ${(t11 - t10).toFixed(2)} ms (${subcatsAlone.length} records)`);

  // D. Entire getCachedCategories() with includes via Prisma
  invalidateEngineCache();
  const t12 = performance.now();
  const fullCats = await getCachedCategories();
  const t13 = performance.now();
  console.log(`4d. getCachedCategories() (Prisma findMany + include): ${(t13 - t12).toFixed(2)} ms (${fullCats.length} categories)`);

  // 5. Measure combined sequential vs Promise.all
  console.log('\n--- COMBINED COLD-LOAD EXECUTION ---');
  invalidateEngineCache();
  const tSeqStart = performance.now();
  await getCachedCategories();
  await getCachedSettings();
  await getCachedLevels();
  const tSeqEnd = performance.now();
  console.log(`Sequential execution (Categories -> Settings -> Levels): ${(tSeqEnd - tSeqStart).toFixed(2)} ms`);

  invalidateEngineCache();
  const tParStart = performance.now();
  await Promise.all([
    getCachedCategories(),
    getCachedSettings(),
    getCachedLevels(),
  ]);
  const tParEnd = performance.now();
  console.log(`Parallel execution via Promise.all: ${(tParEnd - tParStart).toFixed(2)} ms`);

  // 6. Test Single Combined Query (e.g. via $queryRaw or a combined JSON query)
  console.log('\n--- SINGLE COMBINED ROUND-TRIP TEST (RAW SQL / BATCH) ---');
  const tRawStart = performance.now();
  const [rawConfig] = await prisma.$queryRaw<any[]>`
    SELECT
      (SELECT json_agg(c ORDER BY c."displayOrder" ASC) FROM (
        SELECT cat.*,
          COALESCE((SELECT json_agg(cw) FROM "CategoryWeight" cw WHERE cw."categoryId" = cat.id), '[]'::json) as "categoryWeights",
          COALESCE((SELECT json_agg(sc ORDER BY sc."displayOrder" ASC) FROM "Subcategory" sc WHERE sc."categoryId" = cat.id AND sc.active = true), '[]'::json) as subcategories
        FROM "Category" cat
        WHERE cat.active = true
      ) c) as categories,
      (SELECT json_agg(s) FROM "SystemSetting" s) as settings,
      (SELECT json_agg(l ORDER BY l."displayOrder" ASC) FROM "Level" l WHERE l.active = true) as levels,
      (SELECT json_agg(cc ORDER BY cc."displayOrder" ASC) FROM "CreativeHubCategory" cc WHERE cc.active = true) as "creativeCategories"
  `;
  const tRawEnd = performance.now();
  console.log(`Single Round-Trip Combined SQL Query: ${(tRawEnd - tRawStart).toFixed(2)} ms`);
  console.log(`  Raw Categories count: ${rawConfig.categories?.length}`);
  console.log(`  Raw Settings count: ${rawConfig.settings?.length}`);
  console.log(`  Raw Levels count: ${rawConfig.levels?.length}`);
  console.log(`  Raw Creative Categories count: ${rawConfig.creativeCategories?.length}`);

  // Test Multiple runs of Single Combined Query to get steady state
  const timings: number[] = [];
  for (let i = 0; i < 5; i++) {
    const s = performance.now();
    await prisma.$queryRaw`
      SELECT
        (SELECT json_agg(c ORDER BY c."displayOrder" ASC) FROM (
          SELECT cat.*,
            COALESCE((SELECT json_agg(cw) FROM "CategoryWeight" cw WHERE cw."categoryId" = cat.id), '[]'::json) as "categoryWeights",
            COALESCE((SELECT json_agg(sc ORDER BY sc."displayOrder" ASC) FROM "Subcategory" sc WHERE sc."categoryId" = cat.id AND sc.active = true), '[]'::json) as subcategories
          FROM "Category" cat
          WHERE cat.active = true
        ) c) as categories,
        (SELECT json_agg(s) FROM "SystemSetting" s) as settings,
        (SELECT json_agg(l ORDER BY l."displayOrder" ASC) FROM "Level" l WHERE l.active = true) as levels,
        (SELECT json_agg(cc ORDER BY cc."displayOrder" ASC) FROM "CreativeHubCategory" cc WHERE cc.active = true) as "creativeCategories"
    `;
    timings.push(performance.now() - s);
  }
  console.log(`Single Round-Trip 5-Run Timings: ${timings.map(t => t.toFixed(1) + 'ms').join(', ')} (Avg: ${(timings.reduce((a,b)=>a+b,0)/timings.length).toFixed(1)}ms)`);
}

diagnose().catch(console.error).finally(() => prisma.$disconnect());
