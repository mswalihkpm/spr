const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    where: { fullName: { contains: 'LUQMAN', mode: 'insensitive' } },
    include: { class: true, libraryRecords: true }
  });
  students.forEach(s => {
    console.log(`Student: ${s.fullName} (${s.id}, sprStudentId: ${s.sprStudentId}, class: ${s.class?.name})`);
    console.log('Library records:', s.libraryRecords);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
