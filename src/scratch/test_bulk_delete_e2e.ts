export {};
const BASE_URL = 'http://localhost:3000';

async function runBulkDeleteTests() {
  console.log('========================================================');
  console.log('SPR MADIN — BULK DELETE END-TO-END VERIFICATION');
  console.log('========================================================\n');

  // Step 1: Admin Login
  console.log('1. Logging in as Admin (excellence@madin.edu.in)...');
  const resLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'excellence@madin.edu.in', password: '7412369' }),
  });
  const cookieHeader = resLogin.headers.get('set-cookie');
  if (!cookieHeader) {
    throw new Error('Failed to login: No cookie received.');
  }
  const authCookie = cookieHeader.split(';')[0];
  console.log('   ✅ Logged in successfully. Auth cookie obtained.\n');

  // Fetch academic metadata
  const resAcad = await fetch(`${BASE_URL}/api/academic`, {
    headers: { Cookie: authCookie },
  });
  const dataAcad = await resAcad.json();
  const testSchoolId = dataAcad.schools?.[0]?.id;
  const testClassId = dataAcad.classes?.[0]?.id;
  const testSubjectId = dataAcad.subjects?.[0]?.id;

  // Step 2: Test Bulk Delete for Students
  console.log('2. Testing Bulk Student Creation & Deletion (/api/students)...');
  const studentIds: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const resCreate = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({
        fullName: `Test Bulk Student ${i}`,
        studentId: `TEST-BULK-${Date.now()}-${i}`,
        schoolId: testSchoolId,
        classId: testClassId,
        division: 'A',
        status: 'ACTIVE',
      }),
    });
    const dataCreate = await resCreate.json();
    if (dataCreate.student?.id) studentIds.push(dataCreate.student.id);
  }
  console.log(`   Created ${studentIds.length} test students:`, studentIds);

  const resBulkDelStudents = await fetch(`${BASE_URL}/api/students`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Cookie: authCookie },
    body: JSON.stringify({ studentIds }),
  });
  const dataBulkDelStudents = await resBulkDelStudents.json();
  console.log('   Bulk delete response:', dataBulkDelStudents);
  if (resBulkDelStudents.ok && (dataBulkDelStudents.count === 3 || dataBulkDelStudents.deletedCount === 3)) {
    console.log('   ✅ PASS: Student Bulk Deletion successful.\n');
  } else {
    throw new Error('Student Bulk Deletion failed');
  }

  // Step 3: Test Bulk Delete for Scores
  console.log('3. Testing Bulk Score Creation & Deletion (/api/scores)...');
  const resStudents = await fetch(`${BASE_URL}/api/students?limit=1`, {
    headers: { Cookie: authCookie },
  });
  const dataStudents = await resStudents.json();
  const testStudentId = dataStudents.students?.[0]?.id;

  // Fetch categories
  const resCats = await fetch(`${BASE_URL}/api/categories`, {
    headers: { Cookie: authCookie },
  });
  const dataCats = await resCats.json();
  const testCategoryId = dataCats.categories?.[0]?.id;

  if (testStudentId && testCategoryId) {
    const resSaveScores = await fetch(`${BASE_URL}/api/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({
        categoryId: testCategoryId,
        subjectId: testSubjectId || undefined,
        entries: [
          { studentId: testStudentId, obtainedScore: 45, maxScore: 50, remarks: 'Bulk Test 1' },
          { studentId: testStudentId, obtainedScore: 48, maxScore: 50, remarks: 'Bulk Test 2' },
        ],
      }),
    });
    const dataSaveScores = await resSaveScores.json();
    console.log('   Save scores response:', dataSaveScores);

    // Fetch score records
    const resFetchScores = await fetch(`${BASE_URL}/api/scores?categoryId=${testCategoryId}&studentId=${testStudentId}`, {
      headers: { Cookie: authCookie },
    });
    const dataFetchScores = await resFetchScores.json();
    const scoreIds = dataFetchScores.records?.map((r: any) => r.id) || [];
    console.log(`   Found ${scoreIds.length} score records for test:`, scoreIds);

    const resBulkDelScores = await fetch(`${BASE_URL}/api/scores`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ ids: scoreIds }),
    });
    const dataBulkDelScores = await resBulkDelScores.json();
    console.log('   Bulk delete response:', dataBulkDelScores);
    if (resBulkDelScores.ok && (dataBulkDelScores.count === scoreIds.length || dataBulkDelScores.deletedCount === scoreIds.length)) {
      console.log('   ✅ PASS: Scores Bulk Deletion successful.\n');
    } else {
      throw new Error('Scores Bulk Deletion failed');
    }
  }

  // Step 4: Test Bulk Delete for Creative Hub Submissions
  console.log('4. Testing Bulk Creative Hub Deletion (/api/creative-hub)...');
  const resCH = await fetch(`${BASE_URL}/api/creative-hub`, {
    headers: { Cookie: authCookie },
  });
  const dataCH = await resCH.json();
  let chCatId = dataCH.categories?.[0]?.id;

  if (!chCatId) {
    const resNewCHCat = await fetch(`${BASE_URL}/api/creative-hub`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ name: 'Short Stories', maxScore: 100 }),
    });
    const dataNewCHCat = await resNewCHCat.json();
    chCatId = dataNewCHCat.category?.id;
  }

  if (testStudentId && chCatId) {
    const creativeIds: string[] = [];
    for (let i = 1; i <= 2; i++) {
      const resCreate = await fetch(`${BASE_URL}/api/creative-hub`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
        body: JSON.stringify({
          studentId: testStudentId,
          categoryId: chCatId,
          title: `Test Creative Entry ${i}`,
          content: 'Test content for bulk deletion',
          score: 85,
          maxScore: 100,
          publicationStatus: 'PUBLISHED',
        }),
      });
      const dataCreate = await resCreate.json();
      if (dataCreate.submission?.id) creativeIds.push(dataCreate.submission.id);
    }
    console.log(`   Created ${creativeIds.length} creative submissions:`, creativeIds);

    const resBulkDelCreative = await fetch(`${BASE_URL}/api/creative-hub`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ ids: creativeIds }),
    });
    const dataBulkDelCreative = await resBulkDelCreative.json();
    console.log('   Bulk delete response:', dataBulkDelCreative);
    if (resBulkDelCreative.ok && (dataBulkDelCreative.count === 2 || dataBulkDelCreative.deletedCount === 2)) {
      console.log('   ✅ PASS: Creative Hub Bulk Deletion successful.\n');
    } else {
      throw new Error('Creative Hub Bulk Deletion failed');
    }
  }

  // Step 5: Test Bulk Delete for Custom Categories
  console.log('5. Testing Bulk Custom Category Deletion (/api/categories)...');
  const categoryIds: string[] = [];
  for (let i = 1; i <= 2; i++) {
    const resCreate = await fetch(`${BASE_URL}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({
        name: `Test Custom Category ${Date.now().toString(36)} ${i}`,
        description: 'Test category description',
        defaultWeight: 5,
        includeInSPR: true,
        subcategories: [{ name: 'Test Subcat A', maxScore: 50 }],
      }),
    });
    const dataCreate = await resCreate.json();
    if (dataCreate.category?.id) categoryIds.push(dataCreate.category.id);
  }
  console.log(`   Created ${categoryIds.length} custom categories:`, categoryIds);

  const resBulkDelCategories = await fetch(`${BASE_URL}/api/categories`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Cookie: authCookie },
    body: JSON.stringify({ categoryIds }),
  });
  const dataBulkDelCategories = await resBulkDelCategories.json();
  console.log('   Bulk delete response:', dataBulkDelCategories);
  if (resBulkDelCategories.ok && dataBulkDelCategories.success) {
    console.log('   ✅ PASS: Categories Bulk Deletion successful.\n');
  } else {
    throw new Error('Categories Bulk Deletion failed');
  }

  // Step 6: Test Bulk Delete for Library Records
  console.log('6. Testing Bulk Library Records Deletion (/api/library)...');
  if (testStudentId) {
    await fetch(`${BASE_URL}/api/library`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({
        action: 'IMPORT_RECORDS',
        readingPeriod: 'Test Period 2026',
        records: [
          { studentId: testStudentId, booksRead: 15, readingScore: 90 },
          { studentId: testStudentId, booksRead: 20, readingScore: 95 },
        ],
      }),
    });

    const resLib = await fetch(`${BASE_URL}/api/library`, { headers: { Cookie: authCookie } });
    const dataLib = await resLib.json();
    const testLibRecordIds = dataLib.records
      ?.filter((r: any) => r.readingPeriod === 'Test Period 2026')
      .map((r: any) => r.id) || [];
    console.log(`   Found ${testLibRecordIds.length} test library records:`, testLibRecordIds);

    const resBulkDelLib = await fetch(`${BASE_URL}/api/library`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ ids: testLibRecordIds }),
    });
    const dataBulkDelLib = await resBulkDelLib.json();
    console.log('   Bulk delete response:', dataBulkDelLib);
    if (resBulkDelLib.ok && dataBulkDelLib.deletedCount === testLibRecordIds.length) {
      console.log('   ✅ PASS: Library Records Bulk Deletion successful.\n');
    } else {
      throw new Error('Library Records Bulk Deletion failed');
    }
  }

  // Step 7: Test Bulk Delete for Staff / User Accounts
  console.log('7. Testing Bulk User Accounts Deletion (/api/settings)...');
  const userIds: string[] = [];
  for (let i = 1; i <= 2; i++) {
    const resCreate = await fetch(`${BASE_URL}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({
        action: 'CREATE_USER',
        userData: {
          name: `Test Staff User ${i}`,
          email: `teststaff${Date.now()}${i}@madin.edu.in`,
          password: 'Password@123',
          role: 'TEACHER',
        },
      }),
    });
    const dataCreate = await resCreate.json();
    if (dataCreate.user?.id) userIds.push(dataCreate.user.id);
  }
  console.log(`   Created ${userIds.length} test staff users:`, userIds);

  const resBulkDelUsers = await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: authCookie },
    body: JSON.stringify({ action: 'BULK_DELETE_USERS', userIds }),
  });
  const dataBulkDelUsers = await resBulkDelUsers.json();
  console.log('   Bulk delete response:', dataBulkDelUsers);
  if (resBulkDelUsers.ok && dataBulkDelUsers.count === 2) {
    console.log('   ✅ PASS: User Accounts Bulk Deletion successful.\n');
  } else {
    throw new Error('User Accounts Bulk Deletion failed');
  }

  console.log('========================================================');
  console.log('🎉 ALL BULK DELETION E2E TESTS COMPLETED SUCCESSFULLY!');
  console.log('========================================================');
}

runBulkDeleteTests().catch((err) => {
  console.error('E2E Test Failure:', err);
  process.exit(1);
});
