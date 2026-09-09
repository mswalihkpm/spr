const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'madin_school_of_excellence_spr_super_secure_jwt_secret_key_2026';

async function main() {
  console.log('====================================================');
  console.log('  COMPREHENSIVE CRUD & BULK DELETE VERIFICATION SUITE');
  console.log('====================================================');

  const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (!superAdmin) throw new Error('No super admin found.');

  const token = jwt.sign(
    { id: superAdmin.id, userId: superAdmin.id, email: superAdmin.email, role: superAdmin.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const BASE_URL = 'http://localhost:3000';

  let passCount = 0;
  let failCount = 0;

  async function test(name, fn) {
    process.stdout.write(`Testing: ${name}... `);
    try {
      await fn();
      console.log('✅ PASS');
      passCount++;
    } catch (err) {
      console.log(`❌ FAIL: ${err.message}`);
      failCount++;
    }
  }

  // 1. Test Students CRUD
  let createdStudentId = null;
  let createdStudentId2 = null;
  const sampleClass = await prisma.academicClass.findFirst();
  const sampleSchool = await prisma.school.findFirst();

  await test('POST /api/students (Create Student 1)', async () => {
    const res = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        studentId: `TEST_STU_${Date.now()}`,
        fullName: 'Test Student CRUD One',
        classId: sampleClass.id,
        schoolId: sampleSchool.id,
        division: 'A',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    createdStudentId = data.student.id;
  });

  await test('POST /api/students (Create Student 2)', async () => {
    const res = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        studentId: `TEST_STU_${Date.now()}_2`,
        fullName: 'Test Student CRUD Two',
        classId: sampleClass.id,
        schoolId: sampleSchool.id,
        division: 'B',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    createdStudentId2 = data.student.id;
  });

  await test('PUT /api/students/[id] (Update Student)', async () => {
    const res = await fetch(`${BASE_URL}/api/students/${createdStudentId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        fullName: 'Test Student CRUD Updated',
        division: 'C',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.student.division !== 'C') throw new Error('Update not reflected');
  });

  await test('DELETE /api/students/[id] (Single Student Cascade Delete)', async () => {
    const res = await fetch(`${BASE_URL}/api/students/${createdStudentId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  });

  await test('DELETE /api/students (Bulk Students Delete)', async () => {
    const res = await fetch(`${BASE_URL}/api/students`, {
      method: 'DELETE',
      headers: authHeaders,
      body: JSON.stringify({ ids: [createdStudentId2] }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  });

  // 2. Test Scores CRUD & Bulk Delete
  let testScoreId1 = null;
  let testScoreId2 = null;
  const existingStudent = await prisma.student.findFirst();
  const islamicCat = await prisma.category.findUnique({ where: { code: 'ISLAMIC' } });

  await test('POST /api/scores (Create Score)', async () => {
    const res = await fetch(`${BASE_URL}/api/scores`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        categoryId: islamicCat.id,
        studentId: existingStudent.id,
        obtainedScore: 88,
        maxScore: 100,
        remarks: 'Automated test score entry',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const record = await prisma.performanceRecord.findFirst({
      where: { studentId: existingStudent.id, categoryId: islamicCat.id, remarks: 'Automated test score entry' },
    });
    testScoreId1 = record.id;
  });

  await test('PUT /api/scores (Update Score)', async () => {
    const res = await fetch(`${BASE_URL}/api/scores`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        id: testScoreId1,
        obtainedScore: 95,
        maxScore: 100,
        remarks: 'Updated automated test score',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.record.obtainedScore !== 95) throw new Error('Score update not reflected');
  });

  await test('POST /api/scores/bulk-upload (Multi-subject dynamic scores)', async () => {
    const res = await fetch(`${BASE_URL}/api/scores/bulk-upload`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        categoryId: islamicCat.id,
        examName: 'Test Midterm Assessment',
        records: [
          {
            studentId: existingStudent.id,
            subjectScores: [
              { subjectName: 'Test Subject Alpha', obtainedScore: 82, maxScore: 100 },
              { subjectName: 'Test Subject Beta', obtainedScore: 91, maxScore: 100 },
            ],
          },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.successCount < 2) throw new Error('Expected at least 2 scores created');
  });

  await test('DELETE /api/scores (Single Delete via query param ?id=)', async () => {
    const res = await fetch(`${BASE_URL}/api/scores?id=${testScoreId1}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  });

  await test('DELETE /api/scores (Bulk Delete via JSON body { ids: [...] })', async () => {
    const testRecords = await prisma.performanceRecord.findMany({
      where: { subject: { name: { in: ['Test Subject Alpha', 'Test Subject Beta'] } } },
      select: { id: true },
    });
    const ids = testRecords.map((r) => r.id);
    const res = await fetch(`${BASE_URL}/api/scores`, {
      method: 'DELETE',
      headers: authHeaders,
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  });

  // 3. Test Exams CRUD & Cascade Delete
  let testExamId = null;
  await test('POST /api/exams (Create Exam)', async () => {
    const res = await fetch(`${BASE_URL}/api/exams`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Test Annual Exam 2026',
        categoryId: islamicCat.id,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    testExamId = data.exam.id;
  });

  await test('PUT /api/exams (Update Exam)', async () => {
    const res = await fetch(`${BASE_URL}/api/exams`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        id: testExamId,
        name: 'Test Annual Exam 2026 (Updated)',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.exam.name !== 'Test Annual Exam 2026 (Updated)') throw new Error('Exam name not updated');
  });

  await test('DELETE /api/exams (Delete Exam & Cascade Performance Records)', async () => {
    const res = await fetch(`${BASE_URL}/api/exams?id=${testExamId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  });

  // 4. Test Terms CRUD
  let testTermId = null;
  await test('POST /api/terms (Create Term)', async () => {
    const res = await fetch(`${BASE_URL}/api/terms`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Test Assessment Term X',
        code: 'TERM_TEST_X',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    testTermId = data.term.id;
  });

  await test('PUT /api/terms (Update Term)', async () => {
    const res = await fetch(`${BASE_URL}/api/terms`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        id: testTermId,
        name: 'Test Assessment Term X (Updated)',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  });

  await test('DELETE /api/terms (Delete Term)', async () => {
    const res = await fetch(`${BASE_URL}/api/terms?id=${testTermId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  });

  // 5. Test Academic Master Entities (School, Class, Subject)
  let testSchoolId = null;
  await test('POST /api/academic (Create School)', async () => {
    const res = await fetch(`${BASE_URL}/api/academic`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'SCHOOL',
        data: { name: 'Test New School Academy', code: 'TNSA' },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    testSchoolId = data.data.id;
  });

  await test('DELETE /api/academic (Delete School)', async () => {
    const res = await fetch(`${BASE_URL}/api/academic?type=SCHOOL&id=${testSchoolId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  });

  // 6. Test Creative Hub Submissions & Master
  let testCreativeId = null;
  const creativeCat = await prisma.creativeHubCategory.findFirst();
  const pubMedia = await prisma.publishedMedia.findFirst();

  await test('POST /api/creative-hub (Create Submission)', async () => {
    const res = await fetch(`${BASE_URL}/api/creative-hub`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        studentId: existingStudent.id,
        categoryId: creativeCat.id,
        publishedMediaId: pubMedia.id,
        title: 'Test Creative Poem Submission',
        score: 85,
        maxScore: 100,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    testCreativeId = data.submission.id;
  });

  await test('PUT /api/creative-hub (Update Submission)', async () => {
    const res = await fetch(`${BASE_URL}/api/creative-hub`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        id: testCreativeId,
        title: 'Test Creative Poem Submission (Updated Title)',
        score: 92,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  });

  await test('DELETE /api/creative-hub (Delete Submission)', async () => {
    const res = await fetch(`${BASE_URL}/api/creative-hub?id=${testCreativeId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  });

  // 7. Test Subcategories CRUD & Bulk Delete
  let testSubcategoryId = null;
  await test('POST /api/subcategories (Create Subcategory)', async () => {
    const res = await fetch(`${BASE_URL}/api/subcategories`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Robotics & AI Skills Test',
        hasLevels: true,
        levelGroup: 'ALL',
        weight: 1.2,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    testSubcategoryId = data.subcategory.id;
  });

  await test('PUT /api/subcategories (Update Subcategory)', async () => {
    const res = await fetch(`${BASE_URL}/api/subcategories`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        id: testSubcategoryId,
        name: 'Robotics & AI Skills (Advanced)',
        weight: 1.5,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  });

  await test('DELETE /api/subcategories (Delete Subcategory & Linked Scores)', async () => {
    const res = await fetch(`${BASE_URL}/api/subcategories?id=${testSubcategoryId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  });

  // 8. Test News CRUD & Bulk Delete
  let testNewsId = null;
  await test('POST /api/news (Create News)', async () => {
    const res = await fetch(`${BASE_URL}/api/news`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Test Announcement for SPR',
        body: 'This is an automated test announcement for system verification.',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    testNewsId = data.news.id;
  });

  await test('PUT /api/news (Update News)', async () => {
    const res = await fetch(`${BASE_URL}/api/news`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        id: testNewsId,
        title: 'Test Announcement for SPR (Updated)',
        subtitle: 'Updated subtitle',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  });

  await test('DELETE /api/news (Delete News)', async () => {
    const res = await fetch(`${BASE_URL}/api/news?id=${testNewsId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  });

  // 9. Test Reports & Inquiries CRUD
  let testReportId = null;
  await test('POST /api/reports (Public Inquiry Submission)', async () => {
    const res = await fetch(`${BASE_URL}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Test Student Report',
        reporterName: 'Parent of Test Student',
        message: 'Requesting review of Term 1 Arabic score.',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    testReportId = data.report.id;
  });

  await test('PATCH /api/reports (Admin Update Report Status)', async () => {
    const res = await fetch(`${BASE_URL}/api/reports`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        reportId: testReportId,
        status: 'RESOLVED',
        adminNotes: 'Score verified and updated.',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  });

  await test('DELETE /api/reports (Delete Report)', async () => {
    const res = await fetch(`${BASE_URL}/api/reports?id=${testReportId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
  });

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================');
  if (failCount > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
