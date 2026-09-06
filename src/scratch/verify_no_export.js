const http = require('http');

function fetchText(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, html: data }));
    }).on('error', reject);
  });
}

async function verifyLeaderboard() {
  const res = await fetchText('http://localhost:3000/leaderboard');
  console.log('GET /leaderboard status:', res.status);
  console.log('Contains "Export Excel":', res.html.includes('Export Excel'));
  console.log('Contains "Overview":', res.html.includes('Overview'));
}

verifyLeaderboard().catch(console.error);
