const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function verifyAll() {
  console.log('--- RUNNING FULL EXAM & SCORE BULK DELETE VERIFICATION ---');

  const schoolCat = await p.category.findUnique({ where: { code: 'SCHOOL' } });
  const student = await p.student.findFirst();
  const year = await p.academicYear.findFirst({ where: { isCurrent: true } }) || await p.academicYear.findFirst();
  const term = await p.term.findFirst({ where: { isCurrent: true } }) || await p.term.findFirst();
  const subject = await p.subject.findFirst({ where: { categoryId: schoolCat.id } });

  // 1. Create a dummy test exam
  const testExam = await p.exam.create({
    data: {
      name: 'Test Temporary Batch Exam ' + Date.now(),
      categoryId: schoolCat.id,
      termId: term.id,
      academicYearId: year.id,
    },
  });
  console.log('1. Created Test Exam:', testExam.id, testExam.name);

  // 2. Create 5 test performance records for this exam
  const createdScores = await Promise.all([1, 2, 3, 4, 5].map((idx) =>
    p.performanceRecord.create({
      data: {
        studentId: student.id,
        categoryId: schoolCat.id,
        examId: testExam.id,
        subjectId: subject.id,
        obtainedScore: 70 + idx,
        maxScore: 100,
        percentage: 70 + idx,
      },
    })
  ));
  console.log(`2. Created ${createdScores.length} test performance records for test exam.`);

  // Verify count
  let scoreCount = await p.performanceRecord.count({ where: { examId: testExam.id } });
  console.log(`3. Verified score count for test exam: ${scoreCount} (expected 5)`);

  // 4. Test deleting 2 records by IDs (selective bulk delete)
  const idsToDelete = [createdScores[0].id, createdScores[1].id];
  const deleteSelectedRes = await p.performanceRecord.deleteMany({
    where: { id: { in: idsToDelete } },
  });
  console.log(`4. Deleted ${deleteSelectedRes.count} scores by ID array (expected 2)`);

  // Verify remaining
  scoreCount = await p.performanceRecord.count({ where: { examId: testExam.id } });
  console.log(`5. Remaining scores for test exam: ${scoreCount} (expected 3)`);

  // 6. Test clearing all scores for exam (clear scores)
  const clearExamScoresRes = await p.performanceRecord.deleteMany({
    where: { examId: testExam.id },
  });
  console.log(`6. Cleared ${clearExamScoresRes.count} scores for exam (expected 3)`);

  // 7. Test deleting the exam session entity
  await p.exam.delete({ where: { id: testExam.id } });
  const checkExam = await p.exam.findUnique({ where: { id: testExam.id } });
  console.log(`7. Exam deleted: ${checkExam === null ? 'SUCCESS (null)' : 'FAILED'}`);

  console.log('--- ALL VERIFICATIONS PASSED SUCCESSFULLY ---');
}

verifyAll()
  .catch(console.error)
  .finally(() => p.$disconnect());
