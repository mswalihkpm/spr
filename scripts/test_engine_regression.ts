import * as fs from 'fs';
import * as path from 'path';
import { calculateAllLeaderboards, getCachedCategories } from '../src/lib/spr-engine';
import { prisma } from '../src/lib/prisma';

export async function captureBaseline() {
  console.log('Capturing baseline leaderboard results across all test suites...');

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

  const results: Record<string, any[]> = {};

  for (const suite of testSuites) {
    console.log(`- Running suite: ${suite.name}`);
    const entries = await calculateAllLeaderboards(suite.filters);
    results[suite.name] = entries.map((e) => ({
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
  }

  const outDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'baseline_leaderboard_results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

  console.log(`Baseline captured successfully! Total suites: ${testSuites.length}`);
  console.log(`Saved to ${outPath}`);
  return results;
}

captureBaseline().catch(console.error).then(() => process.exit(0));

