const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNames() {
  const students = await prisma.student.findMany({
    select: { studentId: true, fullName: true, class: { select: { name: true } } }
  });

  const searchNames = ['ANSIL', 'GHAZZALI', 'SWALIH', 'SAHL', 'SAHAL', 'RISHAN'];
  for (const q of searchNames) {
    const matches = students.filter(s => s.fullName.toUpperCase().includes(q));
    console.log(`Query "${q}":`, matches);
  }
}

checkNames().finally(() => prisma.$disconnect());
