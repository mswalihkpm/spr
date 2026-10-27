import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('--- 1. AUDIT ROLES & USERS ---');
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
  });
  console.log('Existing users count:', users.length);
  console.log(users);

  console.log('--- 2. AUDIT STUDENTS ---');
  const studentCount = await prisma.student.count();
  const studentsWithSpr = await prisma.student.count({
    where: { sprStudentId: { not: null } },
  });
  console.log(`Total students: ${studentCount}, With SPR Student ID: ${studentsWithSpr}`);

  console.log('--- 3. AUDIT CATEGORIES & WEIGHTS ---');
  const categories = await prisma.category.findMany({
    include: { categoryWeights: true },
    orderBy: { displayOrder: 'asc' },
  });
  console.log('Categories count:', categories.length);
  for (const c of categories) {
    console.log(`- ${c.name} (Code: ${c.code}, DefaultWeight: ${c.defaultWeight}, Active: ${c.active}, IncludeInSPR: ${c.includeInSPR}) Weights:`, c.categoryWeights);
  }

  console.log('--- 4. AUDIT PERFORMANCE RECORDS DATES ---');
  const perfCount = await prisma.performanceRecord.count();
  const sampleRecords = await prisma.performanceRecord.findMany({
    take: 5,
    select: { id: true, date: true, createdAt: true, updatedAt: true, categoryId: true, obtainedScore: true, maxScore: true },
    orderBy: { date: 'desc' },
  });
  console.log(`Total performance records: ${perfCount}`);
  console.log('Sample performance record dates:', sampleRecords);

  console.log('--- 5. AUDIT LOGS TABLE ---');
  try {
    const auditCount = await prisma.auditLog.count();
    console.log(`AuditLog table rows: ${auditCount}`);
  } catch (err: any) {
    console.log('AuditLog table error:', err.message);
  }
}

main().finally(() => prisma.$disconnect());
