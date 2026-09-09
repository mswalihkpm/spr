const fs = require('fs');

async function testFetch() {
  const SUPABASE_URL = 'https://lezoaunsbfgrbcskedoq.supabase.co';
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard').then(r => r.text());
  const jsFileMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  const jsCode = await fetch('https://msoelibrary.vercel.app' + jsFileMatch[1]).then(r => r.text());

  const anonKey = jsCode.match(/eyJhbGciOi[a-zA-Z0-9_\-\.]+/)[0];

  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`
  };

  // 1. Fetch admin_settings
  const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/admin_settings?select=*&limit=1`, { headers });
  const settings = await settingsRes.json();
  console.log('Settings:', settings);

  // 2. Fetch students
  const studentsRes = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*`, { headers });
  const students = await studentsRes.json();
  console.log('Students count in library:', students.length);

  // 3. Fetch books
  const booksRes = await fetch(`${SUPABASE_URL}/rest/v1/books?select=*&limit=1000`, { headers });
  const books = await booksRes.json();
  console.log('Books count in library:', books.length);

  // 4. Fetch borrow_records
  const borrowRes = await fetch(`${SUPABASE_URL}/rest/v1/borrow_records?select=*&limit=10000`, { headers });
  const borrowRecords = await borrowRes.json();
  console.log('Borrow records count:', borrowRecords.length);

  // 5. Fetch reviews
  const reviewsRes = await fetch(`${SUPABASE_URL}/rest/v1/reviews?select=*&limit=10000`, { headers });
  const reviews = await reviewsRes.json();
  console.log('Reviews count:', reviews.length);

  // Save sample of borrow records
  fs.writeFileSync('src/scratch/borrow_sample.json', JSON.stringify(borrowRecords.slice(0, 10), null, 2));

  // Let's see how leaderboard points are computed in the frontend
  // Let's find the function that takes (borrowRecords, books, scoringTable, reviewPoints)
  // Let's search for "vK" or calculation in JS
}

testFetch();
