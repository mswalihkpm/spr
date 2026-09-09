const fs = require('fs');

async function checkTables() {
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard').then(r => r.text());
  const jsMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  const jsCode = await fetch('https://msoelibrary.vercel.app' + jsMatch[1]).then(r => r.text());
  const anonKeyMatch = jsCode.match(/eyJhbGciOi[a-zA-Z0-9_\-\.]+/);
  const anonKey = anonKeyMatch[0];
  const headers = { apikey: anonKey, Authorization: 'Bearer ' + anonKey };

  const tables = ['reviews', 'students', 'leaderboard_snapshots', 'spr_migration_report'];
  for (const t of tables) {
    const res = await fetch(`https://lezoaunsbfgrbcskedoq.supabase.co/rest/v1/${t}?select=*&limit=100`, { headers }).then(r => r.json());
    console.log(`=== Table: ${t} (Count: ${res?.length}) ===`);
    if (Array.isArray(res) && res.length > 0) {
      console.log('Sample row:', res[0]);
      if (t === 'leaderboard_snapshots') {
        console.log('Snapshots details:', JSON.stringify(res, null, 2));
      }
      if (t === 'reviews') {
        console.log('First 5 reviews:', res.slice(0, 5));
      }
    }
  }
}

checkTables().catch(console.error);
