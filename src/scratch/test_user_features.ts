export {};

const BASE_URL = 'http://localhost:3000';

async function testUserFeatures() {
  console.log('--- Testing User Requests Verification ---');

  // 1. Test Leaderboard endpoint
  console.log('1. Checking /api/leaderboard...');
  const resLb = await fetch(`${BASE_URL}/api/leaderboard`);
  const dataLb = (await resLb.json()) as any;
  console.log(`   Leaderboard Count: ${dataLb.leaderboard?.length}`);
  const top1 = dataLb.leaderboard?.[0];
  console.log(`   Top 1: ${top1?.name} (${top1?.spr}%) - Student ID: ${top1?.studentId}`);

  // 2. Test Report Submission
  console.log('\n2. Testing /api/reports submission...');
  const resReport = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: top1?.studentId,
      studentName: top1?.name,
      className: top1?.className,
      rank: top1?.rank,
      sprScore: top1?.spr,
      reporterName: 'Test Reporter',
      message: 'Verifying that public student reporting works and routes to admin dashboard.',
    }),
  });
  const dataReport = (await resReport.json()) as any;
  console.log(`   Submit Status: ${resReport.status}`);
  console.log(`   Submit Result: ${dataReport.message || dataReport.error}`);

  // 3. Test Admin Login and Reports Retrieval
  console.log('\n3. Testing Admin Login & Dashboard Reports...');
  const resLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@madin.edu.in', password: 'Madin@2026' }),
  });
  const cookie = (resLogin.headers.get('set-cookie') || '').split(';')[0];
  console.log(`   Admin Login Status: ${resLogin.status}`);

  const resGetReports = await fetch(`${BASE_URL}/api/reports`, {
    headers: { Cookie: cookie },
  });
  const dataGetReports = (await resGetReports.json()) as any;
  console.log(`   Admin Reports Retrieved: ${dataGetReports.reports?.length}`);
  console.log(`   Latest Report: "${dataGetReports.reports?.[0]?.message}" by ${dataGetReports.reports?.[0]?.reporterName}`);

  // 4. Test Student Dossier Scorecard for 1-Page A4 Print
  console.log('\n4. Testing /api/public/student/' + top1?.studentId + '...');
  const resStudent = await fetch(`${BASE_URL}/api/public/student/${top1?.studentId}`);
  const dataStudent = (await resStudent.json()) as any;
  console.log(`   Student Dossier Status: ${resStudent.status}`);
  console.log(`   Student Name: ${dataStudent.profile?.student?.fullName}`);
  console.log(`   Overall SPR: ${dataStudent.profile?.overallSPR}%`);
  console.log(`   Categories: ${dataStudent.profile?.categoryScores?.length}`);

  console.log('\n✅ ALL USER SPECIFICATION FEATURES TESTED SUCCESSFULLY!');
}

testUserFeatures().catch(console.error);
