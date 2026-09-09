const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBaseline() {
  console.log('Fixing baseline academic years, terms, and exams...');

  // 1. Academic Year
  let year = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  if (!year) {
    year = await prisma.academicYear.findFirst();
  }
  if (!year) {
    year = await prisma.academicYear.create({
      data: {
        name: '2025-2026',
        isCurrent: true,
        startDate: new Date('2025-06-01'),
        endDate: new Date('2026-03-31'),
      },
    });
  } else {
    await prisma.academicYear.update({
      where: { id: year.id },
      data: { isCurrent: true },
    });
  }

  // 2. Terms
  let term1 = await prisma.term.findFirst({ where: { code: 'T1' } });
  if (!term1) {
    term1 = await prisma.term.create({
      data: {
        name: 'Term 1',
        code: 'T1',
        academicYearId: year.id,
        isCurrent: true,
      },
    });
  } else {
    await prisma.term.update({
      where: { id: term1.id },
      data: { isCurrent: true, academicYearId: year.id },
    });
  }

  const otherTerms = [
    { name: 'Term 2', code: 'T2', isCurrent: false },
    { name: 'Term 3', code: 'T3', isCurrent: false },
    { name: 'Annual Examination', code: 'ANNUAL', isCurrent: false },
  ];

  for (const t of otherTerms) {
    const existing = await prisma.term.findFirst({ where: { code: t.code } });
    if (!existing) {
      await prisma.term.create({
        data: {
          name: t.name,
          code: t.code,
          academicYearId: year.id,
          isCurrent: t.isCurrent,
        },
      });
    }
  }

  // 3. Exams for Islamic and School Studies
  const islamicCat = await prisma.category.findUnique({ where: { code: 'ISLAMIC' } });
  const schoolCat = await prisma.category.findUnique({ where: { code: 'SCHOOL' } });

  let islamicExam = null;
  if (islamicCat) {
    islamicExam = await prisma.exam.findFirst({ where: { categoryId: islamicCat.id } });
    if (!islamicExam) {
      islamicExam = await prisma.exam.create({
        data: {
          name: 'Term 1 Islamic Studies Exam',
          categoryId: islamicCat.id,
          termId: term1.id,
          academicYearId: year.id,
        },
      });
    }
  }

  let schoolExam = null;
  if (schoolCat) {
    schoolExam = await prisma.exam.findFirst({ where: { categoryId: schoolCat.id } });
    if (!schoolExam) {
      schoolExam = await prisma.exam.create({
        data: {
          name: 'Term 1 School Board Examination',
          categoryId: schoolCat.id,
          termId: term1.id,
          academicYearId: year.id,
        },
      });
    }
  }

  // 4. Update any performance records missing termId, academicYearId, or examId
  if (islamicCat && islamicExam) {
    await prisma.performanceRecord.updateMany({
      where: { categoryId: islamicCat.id, examId: null },
      data: { examId: islamicExam.id, termId: term1.id, academicYearId: year.id },
    });
  }

  if (schoolCat && schoolExam) {
    await prisma.performanceRecord.updateMany({
      where: { categoryId: schoolCat.id, examId: null },
      data: { examId: schoolExam.id, termId: term1.id, academicYearId: year.id },
    });
  }

  await prisma.performanceRecord.updateMany({
    where: { termId: null },
    data: { termId: term1.id, academicYearId: year.id },
  });

  const termCount = await prisma.term.count();
  const examCount = await prisma.exam.count();
  const perfCount = await prisma.performanceRecord.count();
  console.log(`Baseline populated: ${termCount} terms, ${examCount} exams, ${perfCount} performance records.`);
}

fixBaseline().finally(() => prisma.$disconnect());
