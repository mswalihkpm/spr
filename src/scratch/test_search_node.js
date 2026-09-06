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

async function run() {
  console.log('Testing search endpoints...');
  
  // Test /api/public/search
  const queries = ['mu', 'Mu', 'Muhammad', 'muhammad', 'Rayan', 'rayan', 'swalih', 'Swalih', 'MSOE', 'msoe', '8', 'Class 8'];
  for (const q of queries) {
    const res = await fetchJson(`http://localhost:3000/api/public/search?q=${encodeURIComponent(q)}`);
    console.log(`GET /api/public/search?q=${q} => status: ${res.status}, students count: ${res.data?.students?.length || 0}`);
    if (res.data?.students?.length > 0) {
      console.log(`   Sample: ${res.data.students[0].fullName} (${res.data.students[0].studentId})`);
    }
  }

  // Test /api/students
  for (const q of ['mu', 'Mu', 'Muhammad', 'muhammad', '8', 'Class 8']) {
    const res = await fetchJson(`http://localhost:3000/api/students?search=${encodeURIComponent(q)}`);
    console.log(`GET /api/students?search=${q} => status: ${res.status}, students count: ${res.data?.students?.length || 0}`);
  }
}

run().catch(console.error);
