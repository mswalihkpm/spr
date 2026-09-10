const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function testDeleteApiLogic() {
  // Let's create 2 dummy performance records
  const student = await p.student.findFirst();
  const schoolCat = await p.category.findUnique({ where: { code: 'SCHOOL' } });
  const exam = await p.exam.findFirst({ where: { categoryId: schoolCat.id } });
  const subject = await p.subject.findFirst({ where: { categoryId: schoolCat.id } });

  const rec1 = await p.performanceRecord.create({
    data: {
      studentId: student.id,
      categoryId: schoolCat.id,
      examId: exam.id,
      subjectId: subject.id,
      obtainedScore: 80,
      maxScore: 100,
      percentage: 80
    }
  });
  const rec2 = await p.performanceRecord.create({
    data: {
      studentId: student.id,
      categoryId: schoolCat.id,
      examId: exam.id,
      subjectId: subject.id,
      obtainedScore: 90,
      maxScore: 100,
      percentage: 90
    }
  });

  console.log('Created test records:', rec1.id, rec2.id);

  // Test deleteMany with array of ids
  const idsToDelete = [rec1.id, rec2.id];
  const deleteResult = await p.performanceRecord.deleteMany({
    where: { id: { in: idsToDelete } }
  });
  console.log('DeleteMany result count:', deleteResult.count);
}

testDeleteApiLogic().catch(console.error).finally(() => p.$disconnect());
