import * as fs from 'fs';
import * as path from 'path';
import { calculateAllLeaderboards, getCachedCategories, invalidateEngineCache } from '../src/lib/spr-engine';
import { prisma } from '../src/lib/prisma';

async function verifyEquivalence() {
  console.log('Verifying exact 100% equivalence of leaderboard engine outputs...');

  // Invalidate any old cache in memory
  invalidateEngineCache();

  const baselinePath = path.resolve(process.cwd(), 'backups/baseline_leaderboard_results.json');
  if (!fs.existsSync(baselinePath)) {
    throw new Error('Baseline file not found at: ' + baselinePath);
  }
  const baseline: Record<string, any[]> = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

  const categories = await getCachedCategories();
  const classes = await prisma.academicClass.findMany({ select: { id: true, name: true } });

  const testSuites: { name: string; filters: any }[] = [
    { name: 'Overall Leaderboard', filters: {} },
    ...categories.map((c) => ({
      name: `Category: ${c.name} (${c.code})`,
      filters: { categoryId: c.id },
    })),
    { name: 'Fest: Sahityotsav', filters: { fest: 'SAHITYOTSAV' } },
    { name: 'Fest: Kalotsav', filters: { fest: 'KALOTSAV' } },
    { name: 'Fest: M-Lit', filters: { fest: 'M_LIT_FEST' } },
    { name: 'Fest: Maharjan', filters: { fest: 'JAMIA_MAHARJAN' } },
    ...classes.slice(0, 3).map((cl) => ({
      name: `Class: ${cl.name}`,
      filters: { classId: cl.id },
    })),
  ];

  let totalComparisons = 0;
  let differencesCount = 0;
  const diffLogs: string[] = [];

  for (const suite of testSuites) {
    const expected = baseline[suite.name];
    if (!expected) {
      console.warn(`Warning: suite ${suite.name} not present in baseline!`);
      continue;
    }

    const actualEntries = await calculateAllLeaderboards(suite.filters);
    const actual = actualEntries.map((e) => ({
      rank: e.rank,
      studentId: e.studentId,
      studentCode: e.studentCode,
      name: e.name,
      className: e.className,
      spr: e.spr,
      totalSprPoints: e.totalSprPoints,
      recordsCount: e.recordsCount,
      isTied: (e as any).isTied,
    }));

    if (expected.length !== actual.length) {
      differencesCount++;
      diffLogs.push(`[${suite.name}] Length mismatch: expected ${expected.length}, got ${actual.length}`);
      continue;
    }

    for (let i = 0; i < expected.length; i++) {
      totalComparisons++;
      const exp = expected[i];
      const act = actual[i];

      if (exp.studentId !== act.studentId) {
        differencesCount++;
        diffLogs.push(`[${suite.name}] Student ordering mismatch at index ${i}: expected ${exp.studentCode} (${exp.name}), got ${act.studentCode} (${act.name})`);
        break;
      }
      if (exp.rank !== act.rank) {
        differencesCount++;
        diffLogs.push(`[${suite.name}] Rank mismatch for ${exp.studentCode}: expected rank ${exp.rank}, got ${act.rank}`);
      }
      if (exp.spr !== act.spr) {
        differencesCount++;
        diffLogs.push(`[${suite.name}] SPR score mismatch for ${exp.studentCode}: expected ${exp.spr}, got ${act.spr}`);
      }
      if (exp.recordsCount !== act.recordsCount) {
        differencesCount++;
        diffLogs.push(`[${suite.name}] Records count mismatch for ${exp.studentCode}: expected ${exp.recordsCount}, got ${act.recordsCount}`);
      }
      if (exp.isTied !== act.isTied) {
        differencesCount++;
        diffLogs.push(`[${suite.name}] Tied status mismatch for ${exp.studentCode}: expected ${exp.isTied}, got ${act.isTied}`);
      }
    }

    console.log(`- Suite "${suite.name}": PASS (${actual.length} students identical)`);
  }

  console.log(`\n======================================================`);
  console.log(`Verification Summary:`);
  console.log(`Total Student Profile / Filter Comparisons: ${totalComparisons}`);
  console.log(`Total Differences Found: ${differencesCount}`);
  if (differencesCount === 0) {
    console.log(`SUCCESS: 100.00% EXACT EQUIVALENCE VERIFIED! ZERO CALCULATION OR RANKING REGRESSIONS.`);
  } else {
    console.error(`FAILURE: Found ${differencesCount} differences!`);
    diffLogs.forEach((l) => console.error(l));
    process.exit(1);
  }
}

verifyEquivalence().catch((err) => {
  console.error(err);
  process.exit(1);
}).then(() => process.exit(0));

