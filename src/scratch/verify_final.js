const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAll() {
  console.log('=== 1. VERIFYING CATEGORIES & SUBCATEGORIES ===');
  const cats = await prisma.category.findMany({
    include: { subcategories: true }
  });
  cats.forEach(c => {
    console.log(`[${c.code}] ${c.name} (${c.subcategories.length} subcategories)`);
    c.subcategories.forEach(s => console.log(`   └─ [${s.code}] ${s.name}`));
  });

  console.log('\n=== 2. VERIFYING KUTHBKHANA USER ===');
  const kithabUser = await prisma.user.findUnique({ where: { email: 'kithab@gmail.com' } });
  console.log('Kithab User:', kithabUser ? `${kithabUser.email} (Role: ${kithabUser.role})` : 'MISSING');

  console.log('\n=== 3. VERIFYING STUDENTS ===');
  const studentCount = await prisma.student.count();
  console.log('Total students in DB:', studentCount);

  console.log('\n=== 4. VERIFYING PERFORMANCE & READING RECORDS ===');
  const perfCount = await prisma.performanceRecord.count();
  const libCount = await prisma.libraryRecord.count();
  const creativeCount = await prisma.creativeHubSubmission.count();
  console.log(`Performance Records: ${perfCount}, Library Records: ${libCount}, Creative Works: ${creativeCount}`);
}

verifyAll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
