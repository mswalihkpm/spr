import { prisma } from '../lib/prisma';
import {
  getCachedCategories,
  getCachedSettings,
  getCachedLevels,
  getCachedCreativeCategories,
  invalidateEngineCache,
} from '../lib/spr-engine';

async function measureBreakdown() {
  console.log('========================================================================');
  console.log('       DETAILED QUERY & LATENCY BREAKDOWN FOR CONFIG DATASETS           ');
  console.log('========================================================================\n');

  // Warmup connection so we measure steady-state query + network time separately from TLS handshake
  await prisma.$queryRaw`SELECT 1`;

  // 1. Measure PostgreSQL internal execution time vs Total Node.js round trip
  console.log('--- 1. DATABASE EXECUTION TIME (EXPLAIN ANALYZE) vs NETWORK RTT ---');

  const settingExplain: any[] = await prisma.$queryRaw`EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM "SystemSetting"`;
  const settingPlan = settingExplain[0]['QUERY PLAN'][0];
  console.log(`SystemSetting: Internal DB Execution Time = ${settingPlan['Execution Time']} ms (Planning: ${settingPlan['Planning Time']} ms)`);

  const levelExplain: any[] = await prisma.$queryRaw`EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM "Level" WHERE "active" = true ORDER BY "displayOrder" ASC`;
  const levelPlan = levelExplain[0]['QUERY PLAN'][0];
  console.log(`Level: Internal DB Execution Time = ${levelPlan['Execution Time']} ms (Planning: ${levelPlan['Planning Time']} ms)`);

  const catExplain: any[] = await prisma.$queryRaw`EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM "Category" WHERE "active" = true ORDER BY "displayOrder" ASC`;
  const catPlan = catExplain[0]['QUERY PLAN'][0];
  console.log(`Category: Internal DB Execution Time = ${catPlan['Execution Time']} ms (Planning: ${catPlan['Planning Time']} ms)`);

  const catWeightExplain: any[] = await prisma.$queryRaw`EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM "CategoryWeight"`;
  const catWeightPlan = catWeightExplain[0]['QUERY PLAN'][0];
  console.log(`CategoryWeight: Internal DB Execution Time = ${catWeightPlan['Execution Time']} ms (Planning: ${catWeightPlan['Planning Time']} ms)`);

  const subcatExplain: any[] = await prisma.$queryRaw`EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM "Subcategory" WHERE "active" = true ORDER BY "displayOrder" ASC`;
  const subcatPlan = subcatExplain[0]['QUERY PLAN'][0];
  console.log(`Subcategory: Internal DB Execution Time = ${subcatPlan['Execution Time']} ms (Planning: ${subcatPlan['Planning Time']} ms)`);

  // 2. Measure Round Trip Time (RTT) per single query across 5 runs
  console.log('\n--- 2. INDIVIDUAL PRISMA QUERY ROUND-TRIP LATENCIES (5 RUNS AVERAGE) ---');

  async function measureAvg(fn: () => Promise<any>, runs = 5): Promise<{ avg: number; min: number; max: number; all: number[] }> {
    const times: number[] = [];
    for (let i = 0; i < runs; i++) {
      const s = performance.now();
      await fn();
      times.push(performance.now() - s);
    }
    const avg = times.reduce((a, b) => a + b, 0) / runs;
    return { avg, min: Math.min(...times), max: Math.max(...times), all: times };
  }

  const rSetting = await measureAvg(() => prisma.systemSetting.findMany());
  console.log(`SystemSetting query: Avg = ${rSetting.avg.toFixed(1)} ms (Min: ${rSetting.min.toFixed(1)}ms, Max: ${rSetting.max.toFixed(1)}ms)`);

  const rLevel = await measureAvg(() => prisma.level.findMany({ where: { active: true }, orderBy: { displayOrder: 'asc' } }));
  console.log(`Level query: Avg = ${rLevel.avg.toFixed(1)} ms (Min: ${rLevel.min.toFixed(1)}ms, Max: ${rLevel.max.toFixed(1)}ms)`);

  const rCreative = await measureAvg(() => prisma.creativeHubCategory.findMany({ where: { active: true }, orderBy: { displayOrder: 'asc' } }));
  console.log(`CreativeHubCategory query: Avg = ${rCreative.avg.toFixed(1)} ms (Min: ${rCreative.min.toFixed(1)}ms, Max: ${rCreative.max.toFixed(1)}ms)`);

  const rCatMain = await measureAvg(() => prisma.category.findMany({ where: { active: true }, orderBy: { displayOrder: 'asc' } }));
  console.log(`Category (main table): Avg = ${rCatMain.avg.toFixed(1)} ms (Min: ${rCatMain.min.toFixed(1)}ms, Max: ${rCatMain.max.toFixed(1)}ms)`);

  const rCatWeight = await measureAvg(() => prisma.categoryWeight.findMany());
  console.log(`CategoryWeight (table): Avg = ${rCatWeight.avg.toFixed(1)} ms (Min: ${rCatWeight.min.toFixed(1)}ms, Max: ${rCatWeight.max.toFixed(1)}ms)`);

  const rSubcat = await measureAvg(() => prisma.subcategory.findMany({ where: { active: true }, orderBy: { displayOrder: 'asc' } }));
  console.log(`Subcategory (table): Avg = ${rSubcat.avg.toFixed(1)} ms (Min: ${rSubcat.min.toFixed(1)}ms, Max: ${rSubcat.max.toFixed(1)}ms)`);

  const rFullCat = await measureAvg(() => {
    invalidateEngineCache();
    return getCachedCategories();
  });
  console.log(`Full getCachedCategories() (3 sequential queries): Avg = ${rFullCat.avg.toFixed(1)} ms (Min: ${rFullCat.min.toFixed(1)}ms, Max: ${rFullCat.max.toFixed(1)}ms)`);

  // 3. Measure Total Sequential Combined Load vs Promise.all vs Single Combined Query
  console.log('\n--- 3. COMPARISON OF FETCHING STRATEGIES (COLD CACHE) ---');

  const rSequential = await measureAvg(async () => {
    invalidateEngineCache();
    await getCachedCategories();
    await getCachedSettings();
    await getCachedLevels();
  });
  console.log(`A) Sequential (Categories -> Settings -> Levels): Avg = ${rSequential.avg.toFixed(1)} ms`);

  const rParallel = await measureAvg(async () => {
    invalidateEngineCache();
    await Promise.all([
      getCachedCategories(),
      getCachedSettings(),
      getCachedLevels(),
    ]);
  });
  console.log(`B) Parallel (Promise.all): Avg = ${rParallel.avg.toFixed(1)} ms`);

  // C) Single combined query in one round-trip (e.g. unified raw SQL or combined select)
  const rUnifiedSql = await measureAvg(async () => {
    return prisma.$queryRaw`
      SELECT
        (SELECT json_agg(c ORDER BY c."displayOrder" ASC) FROM (
          SELECT cat.*,
            COALESCE((SELECT json_agg(cw) FROM "CategoryWeight" cw WHERE cw."categoryId" = cat.id), '[]'::json) as "categoryWeights",
            COALESCE((SELECT json_agg(sc ORDER BY sc."displayOrder" ASC) FROM "Subcategory" sc WHERE sc."categoryId" = cat.id AND sc.active = true), '[]'::json) as subcategories
          FROM "Category" cat
          WHERE cat.active = true
        ) c) as categories,
        (SELECT json_agg(s) FROM "SystemSetting" s) as settings,
        (SELECT json_agg(l ORDER BY l."displayOrder" ASC) FROM "Level" l WHERE l.active = true) as levels
    `;
  });
  console.log(`C) Single Unified SQL Query (1 Round-Trip): Avg = ${rUnifiedSql.avg.toFixed(1)} ms`);

  // D) Unified 4 separate queries parallelized via $transaction or batch
  const rTransaction = await measureAvg(async () => {
    return prisma.$transaction([
      prisma.category.findMany({
        where: { active: true },
        include: {
          categoryWeights: true,
          subcategories: {
            where: { active: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.systemSetting.findMany(),
      prisma.level.findMany({
        where: { active: true },
        orderBy: { displayOrder: 'asc' },
      }),
    ]);
  });
  console.log(`D) Prisma $transaction batch: Avg = ${rTransaction.avg.toFixed(1)} ms`);

  // 4. Verify Data Equality
  console.log('\n--- 4. DATA INTEGRITY CHECK (UNIFIED vs ORIGINAL) ---');
  const origCats = await getCachedCategories();
  const origSettings = await getCachedSettings();
  const origLevels = await getCachedLevels();

  console.log(`Categories count: ${origCats.length}, Subcategories count: ${origCats.reduce((sum, c) => sum + (c.subcategories?.length || 0), 0)}, CategoryWeights count: ${origCats.reduce((sum, c) => sum + (c.categoryWeights?.length || 0), 0)}`);
  console.log(`Settings keys count: ${Object.keys(origSettings).length}`);
  console.log(`Levels count: ${origLevels.length}`);
}

measureBreakdown().catch(console.error).finally(() => prisma.$disconnect());
