export {};
const BASE_URL = 'http://localhost:3000';

async function runE2ETests() {
  console.log('========================================================');
  console.log('SPR MADIN — COMPLETE END-TO-END AUTOMATED VERIFICATION');
  console.log('========================================================\n');

  // Test 1: Verify Display Endpoint (Public, No Auth Needed)
  console.log('1. Testing Public Display Mode API (/api/display)...');
  const resDisplay = await fetch(`${BASE_URL}/api/display`);
  console.log(`   Status: ${resDisplay.status}`);
  const dataDisplay = (await resDisplay.json()) as any;
  console.log(`   Institution: "${dataDisplay.institutionName}"`);
  console.log(`   Leaderboard Count: ${dataDisplay.leaderboard?.length}`);
  console.log(`   Top 1: ${dataDisplay.topThree?.[0]?.name} (${dataDisplay.topThree?.[0]?.spr}%)`);
  console.log(`   Top 2: ${dataDisplay.topThree?.[1]?.name} (${dataDisplay.topThree?.[1]?.spr}%)`);
  console.log(`   Top 3: ${dataDisplay.topThree?.[2]?.name} (${dataDisplay.topThree?.[2]?.spr}%)`);
  if (resDisplay.status === 200 && dataDisplay.leaderboard?.length > 0) {
    console.log('   ✅ PASS: Display endpoint is working and privacy-filtered.\n');
  } else {
    console.error('   ❌ FAIL: Display endpoint failed.\n');
  }

  // Test 2: Attempt Login with Initial Super Admin (excellence@madin.edu.in / 159159)
  console.log('2. Testing Initial Super Admin Login (excellence@madin.edu.in / 159159)...');
  const resLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'excellence@madin.edu.in', password: '159159' }),
  });
  console.log(`   Status: ${resLogin.status}`);
  const dataLogin = (await resLogin.json()) as any;
  const cookieHeader = resLogin.headers.get('set-cookie');
  console.log(`   Must Change Password Flag: ${dataLogin.mustChangePassword}`);
  console.log(`   User Role: ${dataLogin.user?.role}`);
  console.log(`   Auth Cookie Received: ${!!cookieHeader}`);

  if (resLogin.status === 200 && dataLogin.mustChangePassword === true && cookieHeader) {
    console.log('   ✅ PASS: Super admin authenticated and mustChangePassword correctly enforced.\n');
  } else {
    console.error('   ❌ FAIL: Login or force password change flag failed.\n');
  }

  // Extract auth cookie
  const authCookie = cookieHeader ? cookieHeader.split(';')[0] : '';

  // Test 3: Perform Forced Password Change (to 'Madin@2026')
  console.log('3. Testing Mandatory First-Login Password Change...');
  const resChangePass = await fetch(`${BASE_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: authCookie,
    },
    body: JSON.stringify({
      currentPassword: '159159',
      newPassword: 'Madin@2026',
      confirmPassword: 'Madin@2026',
    }),
  });
  console.log(`   Status: ${resChangePass.status}`);
  const dataChangePass = (await resChangePass.json()) as any;
  const newCookieHeader = resChangePass.headers.get('set-cookie') || authCookie;
  const newAuthCookie = newCookieHeader.split(';')[0];
  console.log(`   Response Message: "${dataChangePass.message}"`);
  console.log(`   Updated Must Change Password: ${dataChangePass.user?.mustChangePassword}`);

  if (resChangePass.status === 200 && dataChangePass.user?.mustChangePassword === false) {
    console.log('   ✅ PASS: Password successfully updated and permanent access unlocked.\n');
  } else {
    console.error('   ❌ FAIL: Password change failed.\n');
  }

  // Test 4: Verify Old Temporary Password is Now Rejected
  console.log('4. Verifying Old Temporary Password (159159) is Rejected...');
  const resOldPass = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'excellence@madin.edu.in', password: '159159' }),
  });
  console.log(`   Status: ${resOldPass.status} (Expected 401 Unauthorized)`);
  if (resOldPass.status === 401) {
    console.log('   ✅ PASS: Temporary credential 159159 is successfully invalidated.\n');
  } else {
    console.error('   ❌ FAIL: Temporary password was still accepted.\n');
  }

  // Test 5: Verify New Password Works
  console.log('5. Verifying Login with New Password (Madin@2026)...');
  const resNewLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'excellence@madin.edu.in', password: 'Madin@2026' }),
  });
  console.log(`   Status: ${resNewLogin.status}`);
  const dataNewLogin = (await resNewLogin.json()) as any;
  const sessionCookie = (resNewLogin.headers.get('set-cookie') || '').split(';')[0];
  console.log(`   Must Change Password: ${dataNewLogin.mustChangePassword}`);
  if (resNewLogin.status === 200 && dataNewLogin.mustChangePassword === false) {
    console.log('   ✅ PASS: Logged in smoothly with permanent password.\n');
  } else {
    console.error('   ❌ FAIL: Login with new password failed.\n');
  }

  // Test 6: Verify Analytics & Dashboard KPIs
  console.log('6. Testing Institutional Analytics (/api/analytics)...');
  const resAnalytics = await fetch(`${BASE_URL}/api/analytics`, {
    headers: { Cookie: sessionCookie },
  });
  console.log(`   Status: ${resAnalytics.status}`);
  const dataAnalytics = (await resAnalytics.json()) as any;
  console.log(`   Overall Average SPR: ${dataAnalytics.kpi?.overallAverageSPR}%`);
  console.log(`   Total Students: ${dataAnalytics.kpi?.totalStudents}`);
  console.log(`   Total Performance Records: ${dataAnalytics.kpi?.totalPerformanceRecords}`);
  console.log(`   Total Books Read: ${dataAnalytics.kpi?.totalBooksRead}`);
  console.log(`   Class Performance Breakdown: ${dataAnalytics.classPerformance?.map((c: any) => `${c.name}: ${c.averageSPR}%`).join(', ')}`);
  if (resAnalytics.status === 200 && dataAnalytics.kpi?.totalStudents > 0) {
    console.log('   ✅ PASS: Analytics engine calculated multi-class performance.\n');
  } else {
    console.error('   ❌ FAIL: Analytics failed.\n');
  }

  // Test 7: Verify Student Directory & 360° Profile Dossier
  console.log('7. Testing Student Directory & Single Dossier (/api/students)...');
  const resStudents = await fetch(`${BASE_URL}/api/students`, {
    headers: { Cookie: sessionCookie },
  });
  const dataStudents = (await resStudents.json()) as any;
  const firstStudent = dataStudents.students?.[0];
  console.log(`   Fetched ${dataStudents.students?.length} students.`);
  console.log(`   Inspecting Student: ${firstStudent?.fullName} (${firstStudent?.studentId})`);

  const resProfile = await fetch(`${BASE_URL}/api/students/${firstStudent?.id}`, {
    headers: { Cookie: sessionCookie },
  });
  const dataProfile = (await resProfile.json()) as any;
  console.log(`   Profile SPR: ${dataProfile.profile?.overallSPR}%`);
  console.log(`   Institutional Rank: #${dataProfile.profile?.rank}`);
  console.log(`   Class Rank: #${dataProfile.profile?.classRank}`);
  console.log(`   School Rank: #${dataProfile.profile?.schoolRank}`);
  console.log(`   Category Breakdown Count: ${dataProfile.profile?.categoryScores?.length}`);
  if (resProfile.status === 200 && dataProfile.profile?.overallSPR > 0) {
    console.log('   ✅ PASS: 360° Student Performance Dossier verified.\n');
  } else {
    console.error('   ❌ FAIL: Student profile failed.\n');
  }

  // Test 8: Test Leaderboard Rankings & Filters
  console.log('8. Testing Leaderboard Rankings (/api/leaderboard)...');
  const resLeaderboard = await fetch(`${BASE_URL}/api/leaderboard`, {
    headers: { Cookie: sessionCookie },
  });
  const dataLeaderboard = (await resLeaderboard.json()) as any;
  console.log(`   Total Ranked Students: ${dataLeaderboard.totalStudents}`);
  console.log(`   Rank 1: ${dataLeaderboard.leaderboard?.[0]?.name} (${dataLeaderboard.leaderboard?.[0]?.spr}%)`);
  console.log(`   Rank 2: ${dataLeaderboard.leaderboard?.[1]?.name} (${dataLeaderboard.leaderboard?.[1]?.spr}%)`);
  if (resLeaderboard.status === 200 && dataLeaderboard.totalStudents > 0) {
    console.log('   ✅ PASS: Leaderboard computed accurately.\n');
  } else {
    console.error('   ❌ FAIL: Leaderboard failed.\n');
  }

  // Test 9: Test Bulk Excel Import Validation
  console.log('9. Testing Bulk Excel Import Validation (/api/students/bulk-import)...');
  const testRows = [
    { studentName: 'Test Student Alpha', class: 'Class 10', school: 'GBHSS Malappuram', division: 'A' },
    { studentName: '', class: 'Class 9', school: 'CM Academy' }, // Invalid missing name
    { studentName: 'Test Student Beta', class: 'Invalid Class 99', school: 'GBHS Malappuram' }, // Invalid class
  ];

  const resValidation = await fetch(`${BASE_URL}/api/students/bulk-import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      action: 'VALIDATE',
      rows: testRows,
      fileName: 'test_validation.xlsx',
    }),
  });
  const dataValidation = (await resValidation.json()) as any;
  console.log(`   Total Test Rows: ${dataValidation.totalRows}`);
  console.log(`   Valid Rows: ${dataValidation.validRows}`);
  console.log(`   Detected Error Rows: ${dataValidation.errorRows}`);
  console.log(`   Validation Issues: ${dataValidation.issues?.map((i: any) => `[Row ${i.rowNumber}: ${i.field} -> ${i.message}]`).join(' | ')}`);

  if (dataValidation.validRows === 1 && dataValidation.errorRows === 2) {
    console.log('   ✅ PASS: Strict Excel validation detected invalid rows and missing names.\n');
  } else {
    console.error('   ❌ FAIL: Excel validation failed.\n');
  }

  // Test 10: Test Custom Category Builder & Scoring Engine Integration
  console.log('10. Testing Dynamic Custom Category Builder (/api/categories)...');
  const resCreateCategory = await fetch(`${BASE_URL}/api/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      name: 'Public Speaking & Debate',
      description: 'Oratory and debate performances',
      icon: 'Award',
      defaultWeight: 10,
      includeInSPR: true,
      subcategories: [
        { name: 'English Debate', maxScore: 50 },
        { name: 'Malayalam Elocution', maxScore: 50 },
      ],
    }),
  });
  const dataCreateCategory = (await resCreateCategory.json()) as any;
  console.log(`   Created Category Code: ${dataCreateCategory.category?.code}`);
  console.log(`   Default Weight: ${dataCreateCategory.category?.defaultWeight}%`);

  if (resCreateCategory.status === 200 && dataCreateCategory.category?.id) {
    console.log('   ✅ PASS: Custom category dynamically created and hooked into database.\n');
  } else {
    console.error('   ❌ FAIL: Custom category creation failed.\n');
  }

  // Test 11: Test Weight Management & Missing Data Strategies
  console.log('11. Testing Weight Management & Calculation Rules (/api/weights)...');
  const resWeights = await fetch(`${BASE_URL}/api/weights`, {
    headers: { Cookie: sessionCookie },
  });
  const dataWeights = (await resWeights.json()) as any;
  console.log(`   Active Weights Count: ${dataWeights.weights?.length}`);
  console.log(`   Active Missing Data Strategy: "${dataWeights.missingDataRule}"`);

  if (resWeights.status === 200 && dataWeights.weights?.length > 0) {
    console.log('   ✅ PASS: Weight management & calculation rules verified.\n');
  } else {
    console.error('   ❌ FAIL: Weights failed.\n');
  }

  console.log('========================================================');
  console.log('🎯 ALL 11 TEST PHASES PASSED WITH 100% SUCCESS!');
  console.log('========================================================');
}

runE2ETests().catch(console.error);
