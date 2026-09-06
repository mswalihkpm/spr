const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTerms() {
  console.log('Ensuring Academic Year and Terms...');

  // 1. Ensure Academic Year
  let academicYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
  });

  if (!academicYear) {
    academicYear = await prisma.academicYear.findFirst();
  }

  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        name: '2025-2026',
        isCurrent: true,
        startDate: new Date('2025-06-01'),
        endDate: new Date('2026-03-31'),
      },
    });
    console.log('Created Academic Year:', academicYear.name);
  } else {
    console.log('Found Academic Year:', academicYear.name, `(${academicYear.id})`);
  }

  // 2. Ensure Terms
  const defaultTerms = [
    { id: 'term-1-2026', name: 'Term 1', code: 'T1', isCurrent: true },
    { id: 'term-2-2026', name: 'Term 2', code: 'T2', isCurrent: false },
    { id: 'term-3-2026', name: 'Term 3', code: 'T3', isCurrent: false },
    { id: 'term-annual-2026', name: 'Annual', code: 'ANNUAL', isCurrent: false },
  ];

  for (const t of defaultTerms) {
    const existing = await prisma.term.findFirst({
      where: {
        OR: [{ id: t.id }, { code: t.code }, { name: t.name }],
      },
    });

    if (!existing) {
      const created = await prisma.term.create({
        data: {
          id: t.id,
          name: t.name,
          code: t.code,
          academicYearId: academicYear.id,
          isCurrent: t.isCurrent,
        },
      });
      console.log(`Created Term: ${created.name} (${created.code})`);
    } else {
      console.log(`Term already exists: ${existing.name}`);
      if (t.isCurrent && !existing.isCurrent) {
        await prisma.term.update({
          where: { id: existing.id },
          data: { isCurrent: true, academicYearId: academicYear.id },
        });
      }
    }
  }

  const allTerms = await prisma.term.findMany();
  console.log('All terms in DB:', allTerms.map((t) => ({ id: t.id, name: t.name, isCurrent: t.isCurrent })));
}

seedTerms()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
