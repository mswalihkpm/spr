async function testApi() {
  const res = await fetch('http://localhost:3000/api/library');
  const json = await res.json();
  console.log('Status:', res.status);
  console.log('Records count:', json.records?.length);
  console.log('\nTop 5 in API response:');
  json.records?.slice(0, 5).forEach((r) => {
    console.log(`Rank #${r.readingRank}: ${r.student?.fullName} (${r.student?.class?.name}) - ${r.readingScore} pts | ${r.booksRead} books`);
  });
}

testApi().catch(console.error);
