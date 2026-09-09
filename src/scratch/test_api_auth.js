async function testWithLogin() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'excellence@madin.edu.in', password: 'password123' })
  });
  const cookie = loginRes.headers.get('set-cookie');
  console.log('Login status:', loginRes.status);

  const res = await fetch('http://localhost:3000/api/library', {
    headers: cookie ? { cookie } : {}
  });
  const json = await res.json();
  console.log('API Status:', res.status);
  console.log('Records count:', json.records?.length);
  console.log('\nTop 10 in API response:');
  json.records?.slice(0, 10).forEach((r) => {
    console.log(`Rank #${r.readingRank}: ${r.student?.fullName} (${r.student?.class?.name}) - ${r.readingScore} pts | ${r.booksRead} books`);
  });
}

testWithLogin().catch(console.error);
