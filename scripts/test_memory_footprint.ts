import { prisma } from '../src/lib/prisma';
import {
  getCachedCategories,
  getCachedLevels,
  getCachedSubjectsMap,
  getCachedExamsMap,
  getCachedCompetitionsMap,
  getCachedLiteraryCompsMap,
  getCachedCreativeCategories,
} from '../src/lib/spr-engine';

async function testMemoryFootprint() {
  const [categories, levels, subjectsMap, examsMap, competitionsMap, literaryCompsMap, creativeCats] = await Promise.all([
    getCachedCategories(),
    getCachedLevels(),
    getCachedSubjectsMap(),
    getCachedExamsMap(),
    getCachedCompetitionsMap(),
    getCachedLiteraryCompsMap(),
    getCachedCreativeCategories(),
  ]);

  const rawStudents = await prisma.student.findMany({
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

  // Lean Maps (only containing fields actually referenced during calculateAllLeaderboards)
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

  const leanStudents = rawStudents.map((st) => ({
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

  const leanJson = JSON.stringify(leanStudents);
  console.log(`Lean transformed students snapshot: ${leanJson.length} bytes (~${(leanJson.length / 1024).toFixed(2)} KB)`);
  console.log(`Previous unoptimized was: 2,618,256 bytes (~2,556 KB)`);
  console.log(`Reduction: ${(((2618256 - leanJson.length) / 2618256) * 100).toFixed(1)}% memory payload reduction!`);
}

testMemoryFootprint().catch(console.error).then(() => process.exit(0));

