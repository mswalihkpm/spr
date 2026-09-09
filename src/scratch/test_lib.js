const fs = require('fs');

async function test() {
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard').then(r => r.text());
  const jsMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  console.log('jsMatch:', jsMatch[1]);
  const jsCode = await fetch('https://msoelibrary.vercel.app' + jsMatch[1]).then(r => r.text());
  const anonKeyMatch = jsCode.match(/eyJhbGciOi[a-zA-Z0-9_\-\.]+/);
  const anonKey = anonKeyMatch[0];
  const headers = { apikey: anonKey, Authorization: 'Bearer ' + anonKey };

  const [settingsRes, booksRes, borrowRes] = await Promise.all([
    fetch('https://lezoaunsbfgrbcskedoq.supabase.co/rest/v1/admin_settings?select=*&limit=1', { headers }).then(r => r.json()),
    fetch('https://lezoaunsbfgrbcskedoq.supabase.co/rest/v1/books?select=*&limit=10000', { headers }).then(r => r.json()),
    fetch('https://lezoaunsbfgrbcskedoq.supabase.co/rest/v1/borrow_records?select=*&limit=10000', { headers }).then(r => r.json()),
  ]);

  console.log('Settings:', settingsRes[0]);
  console.log('Total borrow records:', borrowRes.length);

  // Look for the date filtering or exact calculation in jsCode
  fs.writeFileSync('src/scratch/lib_bundle.js', jsCode);
  fs.writeFileSync('src/scratch/borrow_records.json', JSON.stringify(borrowRes, null, 2));
  fs.writeFileSync('src/scratch/books.json', JSON.stringify(booksRes, null, 2));
  fs.writeFileSync('src/scratch/settings.json', JSON.stringify(settingsRes, null, 2));
  console.log('Saved files to scratch');
}

test().catch(console.error);
