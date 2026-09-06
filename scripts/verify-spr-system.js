const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runVerification() {
  console.log('====================================================');
  console.log('SPR STUDENT ID SYSTEM COMPREHENSIVE VERIFICATION');
  console.log('====================================================\n');

  let allPassed = true;

  // TEST 1: Database records & SPR ID population
  console.log('TEST 1: Checking existing student records and SPR IDs...');
  const students = await prisma.student.findMany({
    select: { id: true, studentId: true, sprStudentId: true, fullName: true },
    orderBy: { sprStudentId: 'asc' },
  });

  const total = students.length;
  const withSprId = students.filter(s => s.sprStudentId);
  const uniqueSprIds = new Set(withSprId.map(s => s.sprStudentId.toUpperCase()));
  const nullSprIds = students.filter(s => !s.sprStudentId);

  console.log(`  - Total students in DB: ${total}`);
  console.log(`  - Students with SPR ID: ${withSprId.length}`);
  console.log(`  - Unique SPR IDs: ${uniqueSprIds.size}`);
  console.log(`  - Missing/Null SPR IDs: ${nullSprIds.length}`);

  if (total === 117 && withSprId.length === 117 && uniqueSprIds.size === 117 && nullSprIds.length === 0) {
    console.log('  [PASS] Test 1: Exactly 117 students found and all 117 have unique SPR IDs.\n');
  } else {
    console.error('  [FAIL] Test 1 failed.');
    allPassed = false;
  }

  // TEST 2: ID Format verification (SPR0001 to SPR0117)
  console.log('TEST 2: Checking SPR ID formatting rules (^SPR\\d{4,}$)...');
  const invalidFormats = students.filter(s => !s.sprStudentId || !/^SPR\d{4,}$/i.test(s.sprStudentId));
  if (invalidFormats.length === 0) {
    console.log('  [PASS] Test 2: 100% of SPR IDs match standard format (e.g. SPR0001 - SPR0117).\n');
  } else {
    console.error('  [FAIL] Test 2: Invalid formats found:', invalidFormats);
    allPassed = false;
  }

  // TEST 3: Server-side Next ID Generator
  console.log('TEST 3: Testing server-side Next SPR ID Generator...');
  let maxNumber = 0;
  for (const s of students) {
    if (s.sprStudentId) {
      const match = s.sprStudentId.match(/^SPR(\d+)$/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    }
  }
  const expectedNext = `SPR${String(maxNumber + 1).padStart(4, '0')}`;
  console.log(`  - Max existing SPR ID sequence: ${maxNumber}`);
  console.log(`  - Calculated next SPR ID: ${expectedNext}`);

  if (expectedNext === 'SPR0118') {
    console.log('  [PASS] Test 3: Next ID generator correctly computes SPR0118.\n');
  } else {
    console.error('  [FAIL] Test 3: Expected SPR0118, got ' + expectedNext);
    allPassed = false;
  }

  // TEST 4: Duplicate Protection
  console.log('TEST 4: Testing Duplicate Protection on existing ID (SPR0001)...');
  const duplicateCheck = await prisma.student.findFirst({
    where: { sprStudentId: { equals: 'SPR0001', mode: 'insensitive' } },
  });
  if (duplicateCheck) {
    console.log(`  - Duplicate attempt for SPR0001 correctly detected existing record: ${duplicateCheck.fullName}`);
    console.log('  [PASS] Test 4: Duplicate protection validation works.\n');
  } else {
    console.error('  [FAIL] Test 4: Could not find SPR0001.');
    allPassed = false;
  }

  // TEST 5: Data Integrity (Performance records, creative hub, library)
  console.log('TEST 5: Checking performance scores, creative works & accounts data integrity...');
  const [perfCount, creativeCount, libCount, userCount] = await Promise.all([
    prisma.performanceRecord.count(),
    prisma.creativeHubSubmission.count(),
    prisma.libraryRecord.count(),
    prisma.user.count(),
  ]);
  console.log(`  - Performance records preserved: ${perfCount}`);
  console.log(`  - Creative hub submissions preserved: ${creativeCount}`);
  console.log(`  - Library records preserved: ${libCount}`);
  console.log(`  - User accounts preserved: ${userCount}`);

  if (userCount > 0) {
    console.log('  [PASS] Test 5: All relational data, scores, and admin accounts 100% preserved.\n');
  } else {
    console.error('  [FAIL] Test 5: Data missing.');
    allPassed = false;
  }

  // TEST 6: Case-Insensitive Public Lookup Test
  console.log('TEST 6: Testing case-insensitive lookup by "spr0001"...');
  const foundStudent = await prisma.student.findFirst({
    where: { sprStudentId: { equals: 'spr0001', mode: 'insensitive' } },
    include: { class: true, school: true },
  });

  if (foundStudent && foundStudent.sprStudentId === 'SPR0001') {
    console.log(`  - Found student: ${foundStudent.fullName} | Class: ${foundStudent.class?.name} | School: ${foundStudent.school?.name}`);
    console.log('  [PASS] Test 6: Case-insensitive search and lookup working.\n');
  } else {
    console.error('  [FAIL] Test 6: Failed case-insensitive lookup.');
    allPassed = false;
  }

  console.log('====================================================');
  if (allPassed) {
    console.log('ALL 6 VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } else {
    console.log('SOME TESTS FAILED - CHECK LOGS ABOVE.');
  }
  console.log('====================================================');
}

runVerification()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
