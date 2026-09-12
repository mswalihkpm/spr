const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const records = await prisma.performanceRecord.findMany({
    where: { category: { code: 'SCHOOL' } },
    include: { exam: true, subject: true, student: true },
    take: 15
  });
  console.log('Sample school records:', records.map(r => ({
    student: r.student?.fullName,
    exam: r.exam?.name,
    subject: r.subject?.name,
    obtained: r.obtainedScore,
    max: r.maxScore,
    pct: r.percentage
  })));
  
  const exams = await prisma.exam.findMany({
    include: { category: true, _count: { select: { performanceRecords: true } } }
  });
  console.log('Exams in DB:', exams.map(e => ({ id: e.id, name: e.name, cat: e.category?.code, count: e._count.performanceRecords })));

  const allCats = await prisma.category.findMany({
    include: { _count: { select: { performanceRecords: true, exams: true, subjects: true } } }
  });
  console.log('Categories summary:', allCats.map(c => ({
    code: c.code,
    name: c.name,
    records: c._count.performanceRecords,
    exams: c._count.exams,
    subjects: c._count.subjects
  })));
}

check().then(() => prisma.$disconnect()).catch(err => {
  console.error(err);
  prisma.$disconnect();
});
