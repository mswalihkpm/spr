const http = require('http');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    }).on('error', reject);
  });
}

async function verifyAll() {
  console.log('====================================================');
  console.log('🔍 VERIFYING SEARCH FUNCTIONALITY ACROSS APPLICATION');
  console.log('====================================================\n');

  const testCases = [
    { query: 'irfan', desc: 'Lowercase student first name' },
    { query: 'IRFAN', desc: 'Uppercase student first name' },
    { query: 'Irfan', desc: 'Titlecase student first name' },
    { query: 'muhammad', desc: 'Lowercase common name' },
    { query: 'MUHAMMAD', desc: 'Uppercase common name' },
    { query: 'swalih', desc: 'Swalih lowercase search' },
    { query: 'msoe-2026-001', desc: 'Lowercase student ID code' },
    { query: 'MSOE-2026-001', desc: 'Uppercase student ID code' },
    { query: '001', desc: 'Partial student ID number' },
    { query: '8', desc: 'Class number single digit' },
    { query: 'Class 8', desc: 'Full class name' },
    { query: 'Class 10', desc: 'Class 10 search' },
    { query: 'Malappuram', desc: 'School city name' },
    { query: 'GBHS', desc: 'School code name' },
    { query: 'irfan 8', desc: 'Multi-word: Name + Class' },
    { query: 'swalih malappuram', desc: 'Multi-word: Name + School' },
    { query: 'muhammed class 8', desc: 'Multi-word: Name + Class full' },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const res = await fetchJson(`http://localhost:3000/api/public/search?q=${encodeURIComponent(tc.query)}`);
    const count = res.data?.students?.length || 0;
    const isPass = res.status === 200 && count > 0;
    if (isPass) {
      passed++;
      const top = res.data.students[0];
      console.log(`✅ [PASS] "${tc.query}" (${tc.desc}) -> Found ${count} students`);
      console.log(`         Sample: ${top.fullName} (${top.studentId}) - ${top.className} @ ${top.schoolName}`);
    } else {
      failed++;
      console.log(`❌ [FAIL] "${tc.query}" (${tc.desc}) -> HTTP ${res.status}, Count: ${count}`);
    }
  }

  console.log('\n--- Testing Student Dossier by ID & studentId ---');
  // Test dossier lookup with cuid
  const cuidRes = await fetchJson('http://localhost:3000/api/public/student/cmtorfds600007v89o23ng3ej');
  console.log(`Dossier by cuid (cmtorfds600007v89o23ng3ej): HTTP ${cuidRes.status} -> ${cuidRes.data?.profile?.student?.fullName}`);

  // Test dossier lookup with studentId code
  const codeRes = await fetchJson('http://localhost:3000/api/public/student/MSOE-2026-001');
  console.log(`Dossier by studentId code (MSOE-2026-001): HTTP ${codeRes.status} -> ${codeRes.data?.profile?.student?.fullName}`);

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

verifyAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
