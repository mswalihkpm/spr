const fs = require('fs');

async function checkDetails() {
  const SUPABASE_URL = 'https://lezoaunsbfgrbcskedoq.supabase.co';
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard').then(r => r.text());
  const jsFileMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  const jsCode = await fetch('https://msoelibrary.vercel.app' + jsFileMatch[1]).then(r => r.text());
  const anonKey = jsCode.match(/eyJhbGciOi[a-zA-Z0-9_\-\.]+/)[0];
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  // 1. Check reviews for ADHIL AMEEN
  const reviews = await fetch(`${SUPABASE_URL}/rest/v1/reviews?select=*`, { headers }).then(r => r.json());
  console.log('Reviews sample:', reviews.slice(0, 5));

  // 2. Check leaderboard_snapshots
  const snapshots = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard_snapshots?select=*`, { headers }).then(r => r.json());
  console.log('Snapshots count:', snapshots.length);
  if (snapshots.length > 0) {
    console.log('Snapshots:', JSON.stringify(snapshots, null, 2));
  }

  // 3. Check borrow_records for ADHIL AMEEN
  const adhilBorrows = await fetch(`${SUPABASE_URL}/rest/v1/borrow_records?borrower_name=eq.ADHIL AMEEN&select=*`, { headers }).then(r => r.json());
  console.log('ADHIL AMEEN Borrows:', JSON.stringify(adhilBorrows, null, 2));

  // 4. Also check all borrow_records field names in case there are other point fields
  const sampleBorrow = await fetch(`${SUPABASE_URL}/rest/v1/borrow_records?limit=1&select=*`, { headers }).then(r => r.json());
  console.log('Borrow record fields:', Object.keys(sampleBorrow[0] || {}));
}

checkDetails();
