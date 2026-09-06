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

async function check() {
  const res = await fetchJson('http://localhost:3000/api/academic');
  console.log('GET /api/academic status:', res.status);
  console.log('Terms count:', res.data?.terms?.length);
  console.log('Terms:', res.data?.terms?.map(t => ({ id: t.id, name: t.name, isCurrent: t.isCurrent })));
  console.log('Academic Years count:', res.data?.academicYears?.length);
  console.log('Academic Years:', res.data?.academicYears?.map(y => ({ id: y.id, name: y.name, isCurrent: y.isCurrent })));
}

check().catch(console.error);
