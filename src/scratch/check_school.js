const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  const schoolCat = await p.category.findUnique({ where: { code: 'SCHOOL' } });
  console.log('SCHOOL CAT:', schoolCat);
  if (schoolCat) {
    const exams = await p.exam.findMany({
      where: { categoryId: schoolCat.id },
      include: { _count: { select: { performanceRecords: true } } }
    });
    console.log('EXAMS:', JSON.stringify(exams, null, 2));

    const totalRecords = await p.performanceRecord.count({ where: { categoryId: schoolCat.id } });
    console.log('TOTAL SCHOOL RECORDS COUNT:', totalRecords);

    const records = await p.performanceRecord.findMany({
      where: { categoryId: schoolCat.id },
      take: 10,
      select: {
        id: true,
        student: { select: { fullName: true } },
        subject: { select: { name: true } },
        exam: { select: { name: true } },
        examId: true,
        obtainedScore: true,
        percentage: true,
        createdAt: true
      }
    });
    console.log('SAMPLE RECORDS:', JSON.stringify(records, null, 2));
  }
}

check().catch(console.error).finally(() => p.$disconnect());
