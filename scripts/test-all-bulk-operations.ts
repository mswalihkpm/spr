import { prisma } from '../src/lib/prisma';
import { signToken } from '../src/lib/auth';

async function runTests() {
  console.log('--- STARTING BULK DELETE VERIFICATION SUITE ---');

  // 1. Get or create Admin user for JWT
  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] as any } },
  });

  if (!adminUser) {
    throw new Error('No admin user found in database.');
  }

  const token = signToken({
    id: adminUser.id,
    email: adminUser.email,
    name: adminUser.name,
    role: adminUser.role as any,
    mustChangePassword: false,
  });

  const authHeaders = {
    'Content-Type': 'application/json',
    Cookie: `spr_auth_token=${token}`,
  };

  const baseUrl = 'http://localhost:3000';

  // Get references
  const academicClass = await prisma.academicClass.findFirst();
  const school = await prisma.school.findFirst();
  const year = await prisma.academicYear.findFirst();
  const term = await prisma.term.findFirst();
  const category = (await prisma.category.findFirst({ where: { code: 'ISLAMIC' } })) || (await prisma.category.findFirst());
  const subject = await prisma.subject.findFirst();
  const exam = await prisma.exam.findFirst();

  if (!academicClass || !school || !category || !year) {
    throw new Error('Master data missing in database.');
  }

  // TEST 1: BULK DELETE SCORES
  console.log('\n[TEST 1] Testing /api/scores Bulk Delete...');
  const testStudent1 = await prisma.student.create({
    data: {
      studentId: `TEST-ST-${Date.now()}-1`,
      sprStudentId: `SPR-TST1-${Date.now().toString().slice(-4)}`,
      fullName: 'Test Bulk Student One',
      classId: academicClass.id,
      schoolId: school.id,
      division: 'A',
      academicYearId: year.id,
    },
  });

  const score1 = await prisma.performanceRecord.create({
    data: {
      studentId: testStudent1.id,
      categoryId: category.id,
      academicYearId: year?.id,
      subjectId: subject?.id,
      examId: exam?.id,
      obtainedScore: 85,
      maxScore: 100,
      percentage: 85,
    },
  });

  const score2 = await prisma.performanceRecord.create({
    data: {
      studentId: testStudent1.id,
      categoryId: category.id,
      academicYearId: year?.id,
      subjectId: subject?.id,
      examId: exam?.id,
      obtainedScore: 92,
      maxScore: 100,
      percentage: 92,
    },
  });

  const resScoreDel = await fetch(`${baseUrl}/api/scores`, {
    method: 'DELETE',
    headers: authHeaders,
    body: JSON.stringify({ ids: [score1.id, score2.id] }),
  });
  const scoreDelData = await resScoreDel.json();
  console.log('Score Delete Response:', resScoreDel.status, scoreDelData);
  if (!resScoreDel.ok || scoreDelData.count !== 2) {
    throw new Error(`Failed score bulk delete: ${JSON.stringify(scoreDelData)}`);
  }
  const remainingScores = await prisma.performanceRecord.findMany({
    where: { id: { in: [score1.id, score2.id] } },
  });
  if (remainingScores.length !== 0) {
    throw new Error('Scores were not deleted from DB!');
  }
  console.log('✓ Score Bulk Delete passed!');

  // TEST 2: BULK DELETE SUBCATEGORIES
  console.log('\n[TEST 2] Testing /api/subcategories Bulk Delete...');
  const sub1 = await prisma.subcategory.create({
    data: {
      categoryId: category.id,
      name: `Test Subcat 1 ${Date.now()}`,
      code: `TSUB1_${Date.now().toString().slice(-4)}`,
    },
  });
  const sub2 = await prisma.subcategory.create({
    data: {
      categoryId: category.id,
      name: `Test Subcat 2 ${Date.now()}`,
      code: `TSUB2_${Date.now().toString().slice(-4)}`,
    },
  });

  const resSubDel = await fetch(`${baseUrl}/api/subcategories`, {
    method: 'DELETE',
    headers: authHeaders,
    body: JSON.stringify({ ids: [sub1.id, sub2.id] }),
  });
  const subDelData = await resSubDel.json();
  console.log('Subcategories Delete Response:', resSubDel.status, subDelData);
  if (!resSubDel.ok || subDelData.count !== 2) {
    throw new Error(`Failed subcategories bulk delete: ${JSON.stringify(subDelData)}`);
  }
  const remainingSubs = await prisma.subcategory.findMany({
    where: { id: { in: [sub1.id, sub2.id] } },
  });
  if (remainingSubs.length !== 0) {
    throw new Error('Subcategories were not deleted from DB!');
  }
  console.log('✓ Subcategories Bulk Delete passed!');

  // TEST 3: BULK DELETE NEWS
  console.log('\n[TEST 3] Testing /api/news Bulk Delete...');
  const news1 = await prisma.news.create({
    data: {
      title: 'Test Announcement 1',
      body: 'Test body 1',
      active: true,
    },
  });
  const news2 = await prisma.news.create({
    data: {
      title: 'Test Announcement 2',
      body: 'Test body 2',
      active: true,
    },
  });

  const resNewsDel = await fetch(`${baseUrl}/api/news`, {
    method: 'DELETE',
    headers: authHeaders,
    body: JSON.stringify({ ids: [news1.id, news2.id] }),
  });
  const newsDelData = await resNewsDel.json();
  console.log('News Delete Response:', resNewsDel.status, newsDelData);
  if (!resNewsDel.ok || newsDelData.count !== 2) {
    throw new Error(`Failed news bulk delete: ${JSON.stringify(newsDelData)}`);
  }
  const remainingNews = await prisma.news.findMany({
    where: { id: { in: [news1.id, news2.id] } },
  });
  if (remainingNews.length !== 0) {
    throw new Error('News items were not deleted from DB!');
  }
  console.log('✓ News Bulk Delete passed!');

  // TEST 4: BULK DELETE REPORTS
  console.log('\n[TEST 4] Testing /api/reports Bulk Delete...');
  const rep1 = await prisma.studentReport.create({
    data: {
      studentName: 'Test Student Report 1',
      reporterName: 'Tester 1',
      message: 'Test Inquiry 1',
    },
  });
  const rep2 = await prisma.studentReport.create({
    data: {
      studentName: 'Test Student Report 2',
      reporterName: 'Tester 2',
      message: 'Test Inquiry 2',
    },
  });

  const resRepDel = await fetch(`${baseUrl}/api/reports`, {
    method: 'DELETE',
    headers: authHeaders,
    body: JSON.stringify({ ids: [rep1.id, rep2.id] }),
  });
  const repDelData = await resRepDel.json();
  console.log('Reports Delete Response:', resRepDel.status, repDelData);
  if (!resRepDel.ok || repDelData.count !== 2) {
    throw new Error(`Failed reports bulk delete: ${JSON.stringify(repDelData)}`);
  }
  const remainingReps = await prisma.studentReport.findMany({
    where: { id: { in: [rep1.id, rep2.id] } },
  });
  if (remainingReps.length !== 0) {
    throw new Error('Reports were not deleted from DB!');
  }
  console.log('✓ Reports Bulk Delete passed!');

  // TEST 5: BULK DELETE LIBRARY RECORDS
  console.log('\n[TEST 5] Testing /api/library Bulk Delete...');
  const lib1 = await prisma.libraryRecord.create({
    data: {
      studentId: testStudent1.id,
      booksRead: 5,
      readingScore: 40,
    },
  });
  const lib2 = await prisma.libraryRecord.create({
    data: {
      studentId: testStudent1.id,
      booksRead: 8,
      readingScore: 65,
    },
  });

  const resLibDel = await fetch(`${baseUrl}/api/library`, {
    method: 'DELETE',
    headers: authHeaders,
    body: JSON.stringify({ ids: [lib1.id, lib2.id] }),
  });
  const libDelData = await resLibDel.json();
  console.log('Library Delete Response:', resLibDel.status, libDelData);
  if (!resLibDel.ok || libDelData.deletedCount !== 2) {
    throw new Error(`Failed library bulk delete: ${JSON.stringify(libDelData)}`);
  }
  const remainingLib = await prisma.libraryRecord.findMany({
    where: { id: { in: [lib1.id, lib2.id] } },
  });
  if (remainingLib.length !== 0) {
    throw new Error('Library records were not deleted from DB!');
  }
  console.log('✓ Library Bulk Delete passed!');

  // TEST 6: BULK DELETE STUDENTS
  console.log('\n[TEST 6] Testing /api/students Bulk Delete...');
  const testStudent2 = await prisma.student.create({
    data: {
      studentId: `TEST-ST-${Date.now()}-2`,
      sprStudentId: `SPR-TST2-${Date.now().toString().slice(-4)}`,
      fullName: 'Test Bulk Student Two',
      classId: academicClass.id,
      schoolId: school.id,
      division: 'A',
      academicYearId: year.id,
    },
  });

  const resStudentDel = await fetch(`${baseUrl}/api/students`, {
    method: 'DELETE',
    headers: authHeaders,
    body: JSON.stringify({ ids: [testStudent1.id, testStudent2.id] }),
  });
  const studentDelData = await resStudentDel.json();
  console.log('Students Delete Response:', resStudentDel.status, studentDelData);
  if (!resStudentDel.ok || studentDelData.count !== 2) {
    throw new Error(`Failed students bulk delete: ${JSON.stringify(studentDelData)}`);
  }
  const remainingStudents = await prisma.student.findMany({
    where: { id: { in: [testStudent1.id, testStudent2.id] } },
  });
  if (remainingStudents.length !== 0) {
    throw new Error('Students were not deleted from DB!');
  }
  console.log('✓ Students Bulk Delete passed!');

  console.log('\n🎉 ALL BULK DELETION ENDPOINTS VERIFIED & WORKING PERFECTLY!');
}

runTests()
  .catch((err) => {
    console.error('ERROR during testing:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
