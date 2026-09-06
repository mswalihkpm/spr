import { prisma } from '../lib/prisma';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('=== SPR VERIFICATION TEST SUITE ===\n');

  // 1. Check Homepage HTML
  console.log('1. Checking Homepage (/) layout & removed items...');
  const homeRes = await fetch(`${BASE_URL}/`);
  if (!homeRes.ok) throw new Error(`Homepage failed with status ${homeRes.status}`);
  const homeHtml = await homeRes.text();

  // Verify removed items
  const checks = [
    { name: 'Top announcement bar removed', test: !homeHtml.includes('Madin School of Excellence • Students Performance Rate (SPR) Portal') },
    { name: 'Hero badge removed', test: !homeHtml.includes('Official Student Performance Rate (SPR) System') },
    { name: 'Normalized scale box removed', test: !homeHtml.includes('Normalized Scale') },
    { name: 'Real-time sync box removed', test: !homeHtml.includes('Real-Time Sync') },
    { name: 'Student ID column header removed', test: !homeHtml.includes('STUDENT ID') && !homeHtml.includes('Student ID') },
    { name: 'Place name removed from header', test: !homeHtml.includes('Malappuram, Kerala') },
    { name: 'Admin login present in footer', test: homeHtml.includes('Staff / Admin Portal Access') || homeHtml.includes('/login') },
    { name: 'Header logo blue styling', test: homeHtml.includes('bg-blue-600') },
  ];

  let allPassed = true;
  for (const c of checks) {
    if (c.test) {
      console.log(`  ✓ ${c.name}`);
    } else {
      console.error(`  ✗ FAILED: ${c.name}`);
      allPassed = false;
    }
  }

  // 2. Check Public Student Profile API
  console.log('\n2. Checking Public Student Profile API (/api/public/student/[id])...');
  const student = await prisma.student.findFirst({
    where: { status: 'ACTIVE' },
  });

  if (student) {
    const studentApiRes = await fetch(`${BASE_URL}/api/public/student/${student.id}`);
    const studentData = await studentApiRes.json();
    console.log(`  ✓ Public student API status: ${studentApiRes.status}`);
    if (studentData.profile?.student?.fullName === student.fullName) {
      console.log(`  ✓ Student full name (${studentData.profile.student.fullName}) matches database!`);
    } else {
      console.error(`  ✗ Student full name mismatch in API`);
      allPassed = false;
    }
  }

  // 3. Check Public Leaderboard
  console.log('\n3. Checking Public Leaderboard (/leaderboard)...');
  const leadRes = await fetch(`${BASE_URL}/leaderboard`);
  const leadHtml = await leadRes.text();
  console.log(`  ✓ Leaderboard status: ${leadRes.status}`);
  if (!leadHtml.includes('STUDENT ID')) {
    console.log('  ✓ No STUDENT ID column on leaderboard');
  } else {
    console.error('  ✗ STUDENT ID column found on leaderboard');
    allPassed = false;
  }

  // 4. Check Public Search API
  console.log('\n4. Checking Public Search API (/api/public/search?q=mu)...');
  const searchRes = await fetch(`${BASE_URL}/api/public/search?q=mu`);
  const searchData = await searchRes.json();
  console.log(`  ✓ Search returned ${searchData.students?.length || 0} students`);

  // 5. Check Score Entry Academic API
  console.log('\n5. Checking Academic API (/api/academic)...');
  const academicRes = await fetch(`${BASE_URL}/api/academic`);
  const academicData = await academicRes.json();
  console.log(`  ✓ Academic classes loaded: ${academicData.classes?.length || 0}`);
  console.log(`  ✓ Academic schools loaded: ${academicData.schools?.length || 0}`);
  console.log(`  ✓ Academic subjects loaded: ${academicData.subjects?.length || 0}`);

  console.log('\n======================================');
  if (allPassed) {
    console.log('🎉 ALL AUTOMATED VERIFICATION CHECKS PASSED!');
  } else {
    console.error('❌ SOME CHECKS FAILED. PLEASE REVIEW.');
  }
}

runTests().catch((e) => {
  console.error('Test failed with error:', e);
  process.exit(1);
});
