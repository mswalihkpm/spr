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

async function testFullDenormalized() {
  const [categories, levels, subjectsMap, examsMap, competitionsMap, literaryCompsMap, creativeCats] = await Promise.all([
    getCachedCategories(),
    getCachedLevels(),
    getCachedSubjectsMap(),
    getCachedExamsMap(),
    getCachedCompetitionsMap(),
    getCachedLiteraryCompsMap(),
    getCachedCreativeCategories(),
  ]);

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const subMap = new Map(categories.flatMap((c) => c.subcategories || []).map((s: any) => [s.id, s]));
  const levelMap = new Map(levels.map((l) => [l.id, l]));
  const creativeCatMap = new Map(creativeCats.map((c) => [c.id, c]));

  const rawStudents = await prisma.student.findMany({
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

  const students = rawStudents.map((st) => ({
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

  const fullJson = JSON.stringify(students);
  console.log(`Full denormalized students JSON: ${fullJson.length} bytes (${(fullJson.length / 1024 / 1024).toFixed(2)} MB)`);
}

testFullDenormalized().catch(console.error).then(() => process.exit(0));

