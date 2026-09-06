const http = require('http');

function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function test() {
  console.log('Testing Report Discrepancy Submission...');
  const res = await postJson('http://localhost:3000/api/reports', {
    studentId: 'MSOE-2026-001',
    studentName: 'MUHAMMAD IRFAN N',
    className: '8',
    rank: 1,
    sprScore: 97.0,
    reporterName: 'Swalih MT',
    message: 'Please review and verify my Term 1 Islamic evaluation score.'
  });

  console.log('Submit Report status:', res.status);
  console.log('Submit Report response:', res.data);
}

test().catch(console.error);
