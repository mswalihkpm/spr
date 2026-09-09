const fs = require('fs');

async function checkStoreReviews() {
  const SUPABASE_URL = 'https://lezoaunsbfgrbcskedoq.supabase.co';
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard').then(r => r.text());
  const jsCode = await fetch('https://msoelibrary.vercel.app' + html.match(/src="(\/assets\/[^"]+\.js)"/)[1]).then(r => r.text());
  const anonKey = jsCode.match(/eyJhbGciOi[a-zA-Z0-9_\-\.]+/)[0];
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  const storeReviews = await fetch(`${SUPABASE_URL}/rest/v1/store_reviews?select=*&limit=100`, { headers }).then(r => r.json());
  console.log('Store reviews count:', storeReviews.length);
  console.log('Store reviews sample:', storeReviews.slice(0, 10));
}

checkStoreReviews();
