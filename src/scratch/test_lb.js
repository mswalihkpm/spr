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

async function test() {
  const lbRes = await fetchJson('http://localhost:3000/api/leaderboard');
  console.log('Leaderboard count:', lbRes.data?.leaderboard?.length);
  if (lbRes.data?.leaderboard?.length > 0) {
    console.log('Sample Leaderboard entry:', lbRes.data.leaderboard[0]);
    const firstStudentId = lbRes.data.leaderboard[0].studentId;
    const dossierRes = await fetchJson(`http://localhost:3000/api/public/student/${firstStudentId}`);
    console.log(`Dossier for ${firstStudentId} status:`, dossierRes.status);
    console.log('Dossier student name:', dossierRes.data?.profile?.student?.fullName);
  }
}

test().catch(console.error);
