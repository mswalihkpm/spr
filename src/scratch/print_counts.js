const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const counts = {
    students: await prisma.student.count(),
    performanceRecords: await prisma.performanceRecord.count(),
    classes: await prisma.academicClass.count(),
    schools: await prisma.school.count(),
    academicYears: await prisma.academicYear.count(),
    terms: await prisma.term.count(),
    exams: await prisma.exam.count(),
    subjects: await prisma.subject.count(),
    categories: await prisma.category.count(),
    subcategories: await prisma.subcategory.count(),
    creativeHubSubmissions: await prisma.creativeHubSubmission.count(),
    libraryRecords: await prisma.libraryRecord.count(),
    importHistories: await prisma.importHistory.count(),
    studentReports: await prisma.studentReport.count(),
    news: await prisma.news.count(),
    users: await prisma.user.count(),
  };
  console.log('CURRENT_DB_COUNTS:', JSON.stringify(counts, null, 2));

  const totalStudents = await prisma.student.count();
  console.log('Total students in DB:', totalStudents);

  const students = await prisma.student.findMany({
    take: 10,
    select: { id: true, studentId: true, fullName: true, class: { select: { name: true } }, school: { select: { name: true } }, createdAt: true }
  });
  console.log('STUDENTS_SAMPLE:', JSON.stringify(students, null, 2));

  const performanceRecords = await prisma.performanceRecord.findMany({
    take: 5,
    select: { id: true, studentId: true, obtainedScore: true, percentage: true, category: { select: { name: true } } }
  });
  console.log('PERFORMANCE_SAMPLE:', JSON.stringify(performanceRecords, null, 2));
}

main().finally(() => prisma.$disconnect());
