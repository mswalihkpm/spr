async function runVerification() {
  const baseUrl = 'http://localhost:3000';
  console.log('--- Starting SPR Verification ---');

  const testEndpoints = [
    '/api/leaderboard',
    '/api/leaderboard?fest=SAHITYOTSAV',
    '/api/leaderboard?fest=KALOTSAV',
    '/api/leaderboard?fest=M_LIT',
    '/api/leaderboard?fest=JAMIA_MAHRAJAN',
    '/api/leaderboard?stream=JAMIATHUL_HIND',
    '/api/leaderboard?stream=MADIN_ACADEMY',
  ];

  for (const ep of testEndpoints) {
    const res = await fetch(`${baseUrl}${ep}`);
    const data = await res.json();
    console.log(`Endpoint: ${ep} -> Status: ${res.status}, Total Students: ${data.totalStudents}, Top 1: ${data.leaderboard?.[0]?.studentName || data.leaderboard?.[0]?.name} (${data.leaderboard?.[0]?.spr}%)`);
  }

  // Test student SPR calculation
  const resLeaderboard = await fetch(`${baseUrl}/api/leaderboard`);
  const lbData = await resLeaderboard.json();
  const topStudentId = lbData.leaderboard[0]?.studentId;

  if (topStudentId) {
    const resSpr = await fetch(`${baseUrl}/api/public/student/${topStudentId}`);
    const sprData = await resSpr.json();
    console.log(`\nStudent SPR Calculation for: ${sprData.profile?.student?.fullName}`);
    console.log(`Overall SPR: ${sprData.profile?.overallScore}%`);
    console.log(`Category Breakdown count: ${sprData.profile?.categoryBreakdown?.length}`);
    console.log(`Subject-wise records count: ${sprData.profile?.subjectWiseRecords?.length}`);
    console.log(`Programme-wise records count: ${sprData.profile?.programmeWiseRecords?.length}`);
  }

  console.log('\n--- Verification complete! ---');
}

runVerification().catch(console.error);
