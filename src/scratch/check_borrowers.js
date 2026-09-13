const SUPABASE_REST_URL = 'https://lezoaunsbfgrbcskedoq.supabase.co';
const LIBRARY_BASE_URL = 'https://msoelibrary.vercel.app';

async function test() {
  const html = await fetch(`${LIBRARY_BASE_URL}/leaderboard`).then(r => r.text());
  const jsMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  const jsCode = await fetch(`${LIBRARY_BASE_URL}${jsMatch[1]}`).then(r => r.text());
  const anonKey = jsCode.match(/eyJhbGciOi[a-zA-Z0-9_\-\.]+/)[0];
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  const borrowRes = await fetch(`${SUPABASE_REST_URL}/rest/v1/borrow_records?select=*&limit=1000`, { headers }).then(r => r.json());
  const names = new Set(borrowRes.map(b => b.borrower_name));
  console.log('Unique borrower names in borrow_records:', Array.from(names));
}

test().catch(console.error);
