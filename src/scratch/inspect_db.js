const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  const studentsCount = await prisma.student.count();
  console.log('Total students:', studentsCount);

  const sampleStudents = await prisma.student.findMany({
    take: 5,
    include: { class: true, school: true }
  });
  console.log('Sample students:', sampleStudents.map(s => ({
    id: s.id,
    studentId: s.studentId,
    fullName: s.fullName,
    className: s.class?.name,
    schoolName: s.school?.name,
    status: s.status
  })));

  const statuses = await prisma.student.groupBy({
    by: ['status'],
    _count: true
  });
  console.log('Statuses:', statuses);

  const classes = await prisma.academicClass.findMany();
  console.log('Classes:', classes.map(c => c.name));

  const schools = await prisma.school.findMany();
  console.log('Schools:', schools.map(s => s.name));
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
