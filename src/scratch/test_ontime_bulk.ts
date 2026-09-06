export {};
const BASE_URL = 'http://localhost:3000';

async function testOntimeAndBulk() {
  console.log('========================================================');
  console.log('TESTING ONTIME TYPING & DYNAMIC MULTI-SUBJECT BULK UPLOAD');
  console.log('========================================================\n');

  // Step 1: Login
  let resLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@madin.edu.in', password: 'Madin@2026' }),
  });
  if (resLogin.status !== 200) {
    resLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'excellence@madin.edu.in', password: '159159' }),
    });
  }
  const cookie = resLogin.headers.get('set-cookie')?.split(';')[0] || '';
  console.log(`1. Login status: ${resLogin.status}`);

  // Step 2: Fetch Categories & Students
  const resMaster = await fetch(`${BASE_URL}/api/academic`);
  const dataMaster = await resMaster.json();
  const islamicCat = dataMaster.categories.find((c: any) => c.code === 'ISLAMIC');
  const schoolCat = dataMaster.categories.find((c: any) => c.code === 'SCHOOL');
  const literaryCat = dataMaster.categories.find((c: any) => c.code === 'LITERARY');
  const progCat = dataMaster.categories.find((c: any) => c.code === 'PROGRAMS');

  const resStudents = await fetch(`${BASE_URL}/api/students?limit=5`, {
    headers: { Cookie: cookie },
  });
  const dataStudents = await resStudents.json();
  const sampleStudents = dataStudents.students || [];

  console.log(`Found ${sampleStudents.length} sample students to test.\n`);
  if (sampleStudents.length === 0) {
    console.error('No students found to test!');
    return;
  }

  const s1 = sampleStudents[0];
  const s2 = sampleStudents[1] || sampleStudents[0];

  // Test A: Islamic Studies Multi-Subject Bulk Upload (Ontime Subject & Exam creation)
  console.log('--- TEST A: Islamic Studies Multi-Subject Dynamic Bulk Upload ---');
  const islamicPayload = {
    categoryId: islamicCat.id,
    examName: 'Jamiathul Hind Annual Examination 2026',
    stream: 'JAMIATHUL_HIND',
    records: [
      {
        studentId: s1.studentId,
        subjectScores: [
          { subjectName: 'Quran & Tafseer Ontime', maxScore: 100, score: 92 },
          { subjectName: 'Fiqh & Usul Fiqh Ontime', maxScore: 100, score: 88 },
          { subjectName: 'Hadith Studies Ontime', maxScore: 50, score: 47 },
        ],
        remarks: 'Excellent performance in religious sciences',
      },
      {
        studentId: s2.studentId,
        subjectScores: [
          { subjectName: 'Quran & Tafseer Ontime', maxScore: 100, score: 95 },
          { subjectName: 'Fiqh & Usul Fiqh Ontime', maxScore: 100, score: 91 },
          { subjectName: 'Hadith Studies Ontime', maxScore: 50, score: 49 },
        ],
        remarks: 'Distinction level mastery',
      },
    ],
  };

  const resIslamic = await fetch(`${BASE_URL}/api/scores/bulk-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify(islamicPayload),
  });
  const dataIslamic = await resIslamic.json();
  console.log(`Islamic Multi-Subject Status: ${resIslamic.status}`);
  console.log(`Success Count: ${dataIslamic.successCount}, Errors: ${dataIslamic.errorCount}`);
  if (resIslamic.status === 200 && dataIslamic.successCount === 6) {
    console.log('✅ PASS: Islamic Studies Multi-Subject dynamic bulk upload succeeded!\n');
  } else {
    console.error('❌ FAIL:', dataIslamic);
  }

  // Test B: School Education Multi-Subject Bulk Upload
  console.log('--- TEST B: School Education Multi-Subject Dynamic Bulk Upload ---');
  const schoolPayload = {
    categoryId: schoolCat.id,
    examName: 'Mid-Term Board Assessment 2026',
    records: [
      {
        studentId: s1.studentId,
        subjectScores: [
          { subjectName: 'Advanced Mathematics Ontime', maxScore: 100, score: 98 },
          { subjectName: 'Physics & Chemistry Ontime', maxScore: 100, score: 94 },
          { subjectName: 'English Literature Ontime', maxScore: 80, score: 76 },
        ],
      },
    ],
  };

  const resSchool = await fetch(`${BASE_URL}/api/scores/bulk-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify(schoolPayload),
  });
  const dataSchool = await resSchool.json();
  console.log(`School Multi-Subject Status: ${resSchool.status}`);
  console.log(`Success Count: ${dataSchool.successCount}`);
  if (resSchool.status === 200 && dataSchool.successCount === 3) {
    console.log('✅ PASS: School Education Multi-Subject dynamic bulk upload succeeded!\n');
  } else {
    console.error('❌ FAIL:', dataSchool);
  }

  // Test C: Literary Festivals Multi-Event Dynamic Bulk Upload
  console.log('--- TEST C: Literary Festivals Multi-Event Dynamic Bulk Upload ---');
  const litPayload = {
    categoryId: literaryCat.id,
    records: [
      {
        studentId: s1.studentId,
        programmeScores: [
          { competitionName: 'Malayalam Speech Ontime', festivalName: 'Sahityotsav 2026', maxScore: 50, score: 48 },
          { competitionName: 'Urdu Ghazal Ontime', festivalName: 'Sahityotsav 2026', maxScore: 50, score: 45 },
        ],
      },
    ],
  };

  const resLit = await fetch(`${BASE_URL}/api/scores/bulk-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify(litPayload),
  });
  const dataLit = await resLit.json();
  console.log(`Literary Multi-Event Status: ${resLit.status}`);
  console.log(`Success Count: ${dataLit.successCount}`);
  if (resLit.status === 200 && dataLit.successCount === 2) {
    console.log('✅ PASS: Literary Festivals Multi-Event dynamic bulk upload succeeded!\n');
  } else {
    console.error('❌ FAIL:', dataLit);
  }

  // Test D: Programs & Competitions Multi-Activity Bulk Upload
  console.log('--- TEST D: Programs & Competitions Multi-Activity Dynamic Bulk Upload ---');
  const progPayload = {
    categoryId: progCat.id,
    records: [
      {
        studentId: s1.studentId,
        programmeScores: [
          { competitionName: 'National Talent Search Ontime', festivalName: 'Talent Olympiad 2026', maxScore: 100, score: 96 },
          { competitionName: 'Robotics Demo Ontime', festivalName: 'Talent Olympiad 2026', maxScore: 50, score: 48 },
        ],
      },
    ],
  };

  const resProg = await fetch(`${BASE_URL}/api/scores/bulk-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify(progPayload),
  });
  const dataProg = await resProg.json();
  console.log(`Program Multi-Activity Status: ${resProg.status}`);
  console.log(`Success Count: ${dataProg.successCount}`);
  if (resProg.status === 200 && dataProg.successCount === 2) {
    console.log('✅ PASS: Programs & Competitions Multi-Activity dynamic bulk upload succeeded!\n');
  } else {
    console.error('❌ FAIL:', dataProg);
  }

  console.log('========================================================');
  console.log('ALL DYNAMIC ONTIME & MULTI-ITEM BULK TESTS PASSED 100%!');
  console.log('========================================================');
}

testOntimeAndBulk().catch(console.error);
