const fs = require('fs');

async function inspectScoringTable() {
  const SUPABASE_URL = 'https://lezoaunsbfgrbcskedoq.supabase.co';
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard').then(r => r.text());
  const jsFileMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  const jsCode = await fetch('https://msoelibrary.vercel.app' + jsFileMatch[1]).then(r => r.text());
  const anonKey = jsCode.match(/eyJhbGciOi[a-zA-Z0-9_\-\.]+/)[0];
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/admin_settings?select=*&limit=1`, { headers }).then(r => r.json());
  console.log('Full settings scoring table:', JSON.stringify(settingsRes[0].scoring_table, null, 2));

  // Also check books read by Adhil Ameen and what their categories and pages are
  const booksRes = await fetch(`${SUPABASE_URL}/rest/v1/books?id=in.("780bfcaa-e7e3-4def-bf40-b8a3eceecd86","6c7fb5e6-31ef-4ede-836c-dd83bd548f27","9f343781-8fc1-45ff-9ede-d1c0935f523e","25764ce8-1089-466f-8226-8d29d4eae21d","e9669b41-cacb-46c5-9cb5-f69d11ca629b")&select=*`, { headers }).then(r => r.json());
  console.log('Adhil Ameen books:', booksRes.map(b => ({ title: b.title, category: b.category, pages: b.pages })));
}

inspectScoringTable();
