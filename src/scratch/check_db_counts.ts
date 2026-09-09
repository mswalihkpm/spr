import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Database Record Counts ---');
  const [
    studentsCount,
    usersCount,
    recordsCount,
    classesCount,
    schoolsCount,
    creativeHubCount,
    libraryCount,
    examsCount,
    subjectsCount,
    categoriesCount,
    subcategoriesCount,
    auditLogsCount,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.user.count(),
    prisma.performanceRecord.count(),
    prisma.academicClass.count(),
    prisma.school.count(),
    prisma.creativeHubSubmission.count(),
    prisma.libraryRecord.count(),
    prisma.exam.count(),
    prisma.subject.count(),
    prisma.category.count(),
    prisma.subcategory.count(),
    prisma.auditLog.count(),
  ]);

  console.log({
    studentsCount,
    usersCount,
    recordsCount,
    classesCount,
    schoolsCount,
    creativeHubCount,
    libraryCount,
    examsCount,
    subjectsCount,
    categoriesCount,
    subcategoriesCount,
    auditLogsCount,
  });

  const students = await prisma.student.findMany({
    take: 10,
    select: { id: true, fullName: true, studentId: true, division: true, createdAt: true },
  });
  console.log('Sample Students in DB:', students);

  const auditLogs = await prisma.auditLog.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: { id: true, action: true, entity: true, userName: true, createdAt: true, newValue: true },
  });
  console.log('Recent Audit Logs:', auditLogs);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
