const http = require('http');

function fetchStatus(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      resolve({ status: res.statusCode, headers: res.headers });
    }).on('error', reject);
  });
}

async function checkRoutes() {
  const routes = [
    'http://localhost:3000/',
    'http://localhost:3000/leaderboard',
    'http://localhost:3000/student/MSOE-2026-001',
    'http://localhost:3000/student/cmtorfds600007v89o23ng3ej',
    'http://localhost:3000/api/public/search?q=irfan',
    'http://localhost:3000/api/public/student/MSOE-2026-001',
  ];

  for (const r of routes) {
    const res = await fetchStatus(r);
    console.log(`${r} => HTTP ${res.status}`);
  }
}

checkRoutes().catch(console.error);
