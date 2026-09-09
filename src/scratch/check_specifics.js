const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSpecifics() {
  const students = await prisma.student.findMany({
    include: { class: true }
  });

  console.log('Arshad matches:');
  console.log(students.filter(s => s.fullName.toUpperCase().includes('ARSHAD')));

  console.log('\nPlus One students:');
  console.log(students.filter(s => s.class?.name === 'Class +1').map(s => `${s.fullName} (${s.id})`));

  console.log('\nPlus Two students:');
  console.log(students.filter(s => s.class?.name === 'Class +2').map(s => `${s.fullName} (${s.id})`));

  console.log('\nSinan matches:');
  console.log(students.filter(s => s.fullName.toUpperCase().includes('SINAN')).map(s => `${s.fullName} (${s.class?.name})`));

  console.log('\nBishrul matches:');
  console.log(students.filter(s => s.fullName.toUpperCase().includes('BISHRUL')).map(s => `${s.fullName} (${s.class?.name})`));
}

checkSpecifics().catch(console.error).finally(() => prisma.$disconnect());
