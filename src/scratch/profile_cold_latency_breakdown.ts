import { prisma } from '../lib/prisma';
import { invalidateEngineCache } from '../lib/spr-engine';

async function measureStep<T>(name: string, fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

async function deepDiagnoseColdLatency() {
  console.log('========================================================================');
  console.log('    DEEP COLD-LOAD PERFORMANCE DIAGNOSIS (READ-ONLY INSTRUMENTATION)    ');
  console.log('========================================================================\n');

  // 1. Raw Network / Database Pooler Ping
  const pings: number[] = [];
  for (let i = 0; i < 3; i++) {
    const { durationMs } = await measureStep('ping', () => prisma.$queryRaw`SELECT 1`);
    pings.push(durationMs);
  }
  const avgPing = pings.reduce((a, b) => a + b, 0) / pings.length;
  console.log(`[Network Baseline] Supabase Pooler Roundtrip Ping: ${avgPing.toFixed(1)} ms\n`);

  // ========================================================================
  // 2. DEEP BREAKDOWN OF /api/leaderboard (COLD)
  // ========================================================================
  console.log('------------------------------------------------------------------------');
  console.log(' DIAGNOSING /api/leaderboard (COLD START BREAKDOWN)');
  console.log('------------------------------------------------------------------------');
  invalidateEngineCache();

  const lbBreakdown: Record<string, number> = {};

  // Step A: Categories Query
  const { result: categories, durationMs: tCat } = await measureStep('catQuery', () =>
    prisma.category.findMany({
      where: { active: true },
      include: {
        categoryWeights: true,
        subcategories: { where: { active: true }, orderBy: { displayOrder: 'asc' } },
      },
      orderBy: { displayOrder: 'asc' },
    })
  );
  lbBreakdown['1. Categories + Weights + Subcategories Query'] = tCat;

  // Step B: Settings Query
  const { result: settings, durationMs: tSet } = await measureStep('settingsQuery', () =>
    prisma.systemSetting.findMany()
  );
  lbBreakdown['2. System Settings Query'] = tSet;

  // Step C: Levels Query
  const { result: levels, durationMs: tLvl } = await measureStep('levelsQuery', () =>
    prisma.level.findMany({ where: { active: true }, orderBy: { displayOrder: 'asc' } })
  );
  lbBreakdown['3. Levels Query'] = tLvl;

  // Step D: The Big Active Students Cohort Query
  const { result: allActiveStudents, durationMs: tStudentsCohort } = await measureStep(
    'studentsCohortQuery',
    () =>
      prisma.student.findMany({
        where: { status: 'ACTIVE' },
        include: {
          class: true,
          school: true,
          academicYear: true,
          performanceRecords: {
            include: {
              category: true,
              subject: {
                include: { institution: true, board: true },
              },
              competition: {
                include: { program: true },
              },
              literaryCompetition: {
                include: { event: true },
              },
              subcategory: true,
              level: true,
            },
          },
          creativeWorks: {
            include: {
              category: true,
            },
          },
          libraryRecords: true,
        },
      })
  );
  lbBreakdown['4. Full Active Students Cohort Query (117 students + 7 deep includes)'] = tStudentsCohort;

  // Step E: In-Memory Calculation for 117 students
  const startCalc = performance.now();
  const entries: any[] = [];
  for (const student of allActiveStudents) {
    let totalPoints = 0;
    const categoryPoints: Record<string, number> = {};
    for (const cat of categories) {
      const records = student.performanceRecords.filter((r) => r.categoryId === cat.id);
      let catSum = 0;
      records.forEach((r) => {
        catSum += r.obtainedScore || 0;
      });
      categoryPoints[cat.id] = catSum;
      totalPoints += catSum;
    }
    entries.push({
      studentId: student.id,
      name: student.fullName,
      spr: totalPoints,
      recordsCount: student.performanceRecords.length + student.creativeWorks.length + student.libraryRecords.length,
    });
  }
  // Sorting & ranking
  entries.sort((a, b) => b.spr - a.spr);
  for (let i = 0; i < entries.length; i++) {
    entries[i].rank = i + 1;
  }
  const calcTime = performance.now() - startCalc;
  lbBreakdown['5. In-Memory SPR Points & Ranking Calculation (117 students)'] = calcTime;

  // Step F: JSON Serialization
  const startJson = performance.now();
  const jsonStr = JSON.stringify({ leaderboard: entries, categories, totalStudents: entries.length });
  const jsonTime = performance.now() - startJson;
  lbBreakdown['6. JSON Serialization (NextResponse.json)'] = jsonTime;

  const totalLbTime = tCat + tSet + tLvl + tStudentsCohort + calcTime + jsonTime;

  console.table(
    Object.entries(lbBreakdown).map(([step, ms]) => ({
      Step: step,
      'Time (ms)': ms.toFixed(1),
      '% of Total': `${((ms / totalLbTime) * 100).toFixed(1)}%`,
    }))
  );
  console.log(`Total /api/leaderboard Cold Duration: ${totalLbTime.toFixed(1)} ms\n`);

  // ========================================================================
  // 3. DEEP BREAKDOWN OF /api/public/student/[id] (COLD)
  // ========================================================================
  console.log('------------------------------------------------------------------------');
  console.log(' DIAGNOSING /api/public/student/[id] (COLD START BREAKDOWN)');
  console.log('------------------------------------------------------------------------');
  invalidateEngineCache();

  const studentBreakdown: Record<string, number> = {};
  const sampleStudent = allActiveStudents[0];

  // Step 1: Initial Student ID lookup
  const { result: studentLookup, durationMs: tLookup } = await measureStep('lookup', () =>
    prisma.student.findUnique({ where: { id: sampleStudent.id } })
  );
  studentBreakdown['1. Initial Student Lookup (findUnique)'] = tLookup;

  // Step 2: calculateStudentSPR(studentId) - Individual Student Deep Query
  const { result: individualStudent, durationMs: tIndivDb } = await measureStep('indivDb', () =>
    prisma.student.findUnique({
      where: { id: sampleStudent.id },
      include: {
        class: true,
        school: true,
        academicYear: true,
        performanceRecords: {
          include: {
            category: true,
            subcategory: true,
            subject: { include: { institution: true, board: true } },
            exam: { include: { term: true } },
            competition: { include: { program: true } },
            literaryCompetition: { include: { event: true } },
            level: true,
          },
        },
        creativeWorks: { include: { category: true, publishedMedia: true } },
        libraryRecords: true,
      },
    })
  );
  studentBreakdown['2. calculateStudentSPR: Individual Student Deep Join Query'] = tIndivDb;

  // Step 3: calculateStudentSPR: Categories + Settings + Levels
  const { durationMs: tMetadata } = await measureStep('metadata', async () => {
    await Promise.all([
      prisma.category.findMany({ include: { categoryWeights: true, subcategories: true } }),
      prisma.systemSetting.findMany(),
      prisma.level.findMany(),
      prisma.creativeHubCategory.findMany(),
    ]);
  });
  studentBreakdown['3. calculateStudentSPR: Metadata Queries (Categories, Settings, Levels)'] = tMetadata;

  // Step 4: Redundant Cohort Query for Rank Calculation
  // In route.ts: const allLeaderboard = await calculateAllLeaderboards(...)
  const { durationMs: tCohortForRank } = await measureStep('cohortForRank', async () => {
    return prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: {
        class: true,
        school: true,
        academicYear: true,
        performanceRecords: {
          include: {
            category: true,
            subject: { include: { institution: true, board: true } },
            competition: { include: { program: true } },
            literaryCompetition: { include: { event: true } },
            subcategory: true,
            level: true,
          },
        },
        creativeWorks: { include: { category: true } },
        libraryRecords: true,
      },
    });
  });
  studentBreakdown['4. Rank Calculation: ENTIRE COHORT Query (all 117 students re-queried)'] = tCohortForRank;

  // Step 5: Student Creative Works Query
  const { durationMs: tCreative } = await measureStep('creative', () =>
    prisma.creativeHubSubmission.findMany({
      where: { studentId: sampleStudent.id, publicationStatus: { in: ['PUBLISHED', 'FEATURED'] } },
      include: { category: true },
      orderBy: { date: 'desc' },
    })
  );
  studentBreakdown['5. Student Creative Works Submissions Query'] = tCreative;

  // Step 6: Student Library Records Query
  const { durationMs: tLib } = await measureStep('library', () =>
    prisma.libraryRecord.findMany({
      where: { studentId: sampleStudent.id },
      orderBy: { createdAt: 'desc' },
    })
  );
  studentBreakdown['6. Student Library Reading Records Query'] = tLib;

  // Step 7: Dossier JSON Serialization
  const startDossierJson = performance.now();
  JSON.stringify({ profile: individualStudent, creativeWorks: [], libraryRecords: [] });
  const tDossierJson = performance.now() - startDossierJson;
  studentBreakdown['7. JSON Serialization'] = tDossierJson;

  const totalStudentTime =
    tLookup + tIndivDb + tMetadata + tCohortForRank + tCreative + tLib + tDossierJson;

  console.table(
    Object.entries(studentBreakdown).map(([step, ms]) => ({
      Step: step,
      'Time (ms)': ms.toFixed(1),
      '% of Total': `${((ms / totalStudentTime) * 100).toFixed(1)}%`,
    }))
  );
  console.log(`Total /api/public/student/[id] Cold Duration: ${totalStudentTime.toFixed(1)} ms\n`);
}

deepDiagnoseColdLatency().catch(console.error).finally(() => prisma.$disconnect());
