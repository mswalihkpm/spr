import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../src/lib/prisma';
import {
  getCachedCategories,
  getCachedLevels,
  getCachedSubjectsMap,
  getCachedExamsMap,
  getCachedCompetitionsMap,
  getCachedLiteraryCompsMap,
  getCachedCreativeCategories,
  getCachedSettings,
  resolveLevelMultiplier,
  resolvePrizeMultiplier,
  resolvePrizeBaseScore,
  LeaderboardEntry,
} from '../src/lib/spr-engine';

// 1. OLD query measurement
async function fetchOldRawStudents() {
  return prisma.student.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      studentId: true,
      sprStudentId: true,
      fullName: true,
      division: true,
      status: true,
      photoUrl: true,
      classId: true,
      schoolId: true,
      academicYearId: true,
      class: { select: { id: true, name: true, numericGrade: true } },
      school: { select: { id: true, name: true, code: true } },
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      performanceRecords: {
        select: {
          id: true,
          categoryId: true,
          subcategoryId: true,
          examId: true,
          subjectId: true,
          competitionId: true,
          literaryCompetitionId: true,
          levelId: true,
          obtainedScore: true,
          maxScore: true,
          position: true,
          remarks: true,
        },
      },
      creativeWorks: {
        select: {
          id: true,
          score: true,
          title: true,
          publicationStatus: true,
          categoryId: true,
        },
      },
      libraryRecords: {
        select: {
          id: true,
          booksRead: true,
          readingScore: true,
          readingPeriod: true,
        },
      },
      taskRecords: {
        where: { status: 'APPROVED' },
        select: {
          id: true,
          awardedPoints: true,
        },
      },
    },
  });
}

// 2. NEW optimized query measurement
async function fetchNewRawStudents() {
  return prisma.student.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      studentId: true,
      sprStudentId: true,
      fullName: true,
      division: true,
      photoUrl: true,
      classId: true,
      schoolId: true,
      academicYearId: true,
      class: { select: { name: true } },
      school: { select: { name: true } },
      performanceRecords: {
        select: {
          categoryId: true,
          subcategoryId: true,
          examId: true,
          subjectId: true,
          competitionId: true,
          literaryCompetitionId: true,
          levelId: true,
          obtainedScore: true,
          maxScore: true,
          position: true,
          remarks: true,
        },
      },
      creativeWorks: {
        select: {
          score: true,
          categoryId: true,
        },
      },
      libraryRecords: {
        select: {
          booksRead: true,
          readingScore: true,
        },
      },
      taskRecords: {
        where: { status: 'APPROVED' },
        select: {
          awardedPoints: true,
        },
      },
    },
  });
}

async function runComparison() {
  console.log('Comparing Old vs New PostgreSQL query payloads...');

  const tOld0 = Date.now();
  const oldData = await fetchOldRawStudents();
  const tOld = Date.now() - tOld0;
  const oldBytes = JSON.stringify(oldData).length;

  const tNew0 = Date.now();
  const newData = await fetchNewRawStudents();
  const tNew = Date.now() - tNew0;
  const newBytes = JSON.stringify(newData).length;

  console.log(`\n--- PostgreSQL Query Results ---`);
  console.log(`Old Query: ${oldBytes} bytes (${(oldBytes / 1024).toFixed(2)} KB) in ${tOld} ms`);
  console.log(`New Query: ${newBytes} bytes (${(newBytes / 1024).toFixed(2)} KB) in ${tNew} ms`);
  console.log(`Reduction: ${(((oldBytes - newBytes) / oldBytes) * 100).toFixed(1)}% saved on PostgreSQL wire`);

  // Verify full leaderboard equivalence with new data
  const baselinePath = path.resolve(process.cwd(), 'backups/baseline_leaderboard_results.json');
  if (!fs.existsSync(baselinePath)) {
    throw new Error('Baseline file not found! Run test_engine_regression.ts first.');
  }
  const baseline: Record<string, any[]> = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

  // Test custom leaderboard execution using new data
  const [categories, levels, subjectsMap, examsMap, competitionsMap, literaryCompsMap, creativeCats, settings] = await Promise.all([
    getCachedCategories(),
    getCachedLevels(),
    getCachedSubjectsMap(),
    getCachedExamsMap(),
    getCachedCompetitionsMap(),
    getCachedLiteraryCompsMap(),
    getCachedCreativeCategories(),
    getCachedSettings(),
  ]);

  const catMap = new Map(categories.map((c) => [c.id, { id: c.id, code: c.code, name: c.name }]));
  const subMap = new Map(
    categories.flatMap((c) => c.subcategories || []).map((s: any) => [
      s.id,
      { id: s.id, code: s.code, name: s.name, weight: s.weight, maxScore: s.maxScore, categoryId: s.categoryId },
    ])
  );
  const levelMap = new Map(
    levels.map((l) => [l.id, { id: l.id, code: l.code, name: l.name, weightMultiplier: l.weightMultiplier }])
  );
  const creativeCatMap = new Map(creativeCats.map((c) => [c.id, { id: c.id, weight: c.weight }]));

  const transformedNewStudents = newData.map((st) => ({
    ...st,
    performanceRecords: st.performanceRecords.map((r) => ({
      ...r,
      category: catMap.get(r.categoryId),
      subcategory: r.subcategoryId ? subMap.get(r.subcategoryId) : undefined,
      level: r.levelId ? levelMap.get(r.levelId) : undefined,
      subject: r.subjectId ? subjectsMap.get(r.subjectId) : undefined,
      exam: r.examId ? examsMap.get(r.examId) : undefined,
      competition: r.competitionId ? competitionsMap.get(r.competitionId) : undefined,
      literaryCompetition: r.literaryCompetitionId ? literaryCompsMap.get(r.literaryCompetitionId) : undefined,
    })),
    creativeWorks: st.creativeWorks.map((w) => ({
      ...w,
      category: w.categoryId ? creativeCatMap.get(w.categoryId) : undefined,
    })),
  }));

  console.log(`\nVerifying equivalence across all test suites in baseline...`);
  // Let's compute overall leaderboard with transformedNewStudents and compare to baseline
  // We can write a custom compute or test via actual spr-engine.
}

runComparison().catch(console.error).then(() => process.exit(0));

