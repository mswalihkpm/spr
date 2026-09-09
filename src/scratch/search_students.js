const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function searchAllStudents() {
  const students = await prisma.student.findMany({
    include: { class: true, school: true }
  });

  const queries = ['ADHIL', 'AMEEN', 'DHANEEN', 'JAVAD', 'LUQMAN', 'NAFEEH', 'ANSIL', 'SWALIH', 'MASHHOOD', 'MAJID', 'HANEEN', 'SAEED', 'UMAR'];

  for (const q of queries) {
    const matches = students.filter(s => s.fullName.toUpperCase().includes(q));
    console.log(`=== Query "${q}" (${matches.length} matches) ===`);
    matches.forEach(s => console.log(`  - ${s.fullName} (${s.class?.name || 'No Class'}) [${s.id}]`));
  }
}

searchAllStudents().catch(console.error).finally(() => prisma.$disconnect());
