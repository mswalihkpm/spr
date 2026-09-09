const fs = require('fs');

async function check() {
  try {
    const html = await fetch('https://msoelibrary.vercel.app/leaderboard').then(r => r.text());
    console.log('HTML length:', html.length);
    const jsFileMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
    if (!jsFileMatch) {
      console.log('No JS bundle match found');
      return;
    }
    const jsUrl = 'https://msoelibrary.vercel.app' + jsFileMatch[1];
    console.log('Fetching JS:', jsUrl);
    const jsCode = await fetch(jsUrl).then(r => r.text());
    console.log('JS Code length:', jsCode.length);

    // Look for supabase url and key or api endpoints
    const supabaseUrlMatch = jsCode.match(/https:\/\/[a-zA-Z0-9-]+\.supabase\.co/g);
    console.log('Supabase URL candidates:', supabaseUrlMatch);

    // Search for anon key pattern: eyJ...
    const anonKeys = jsCode.match(/eyJhbGciOi[a-zA-Z0-9_\-\.]+/g);
    console.log('Anon keys found:', anonKeys ? anonKeys.length : 0);
    if (anonKeys && anonKeys.length > 0) {
      console.log('Sample key:', anonKeys[0].slice(0, 40) + '...');
    }

    // Search for leaderboard queries or tables
    const tableMatches = jsCode.match(/from\(['"]([a-zA-Z0-9_-]+)['"]\)/g);
    console.log('Table names from():', tableMatches);
    
    // Search for strings related to readers / points / leaderboard
    const leaderWords = jsCode.match(/[a-zA-Z0-9_]+points[a-zA-Z0-9_]*/gi);
    console.log('Points related terms:', leaderWords ? [...new Set(leaderWords)].slice(0, 10) : []);

    // Save anon key & supabase url to inspect
    if (supabaseUrlMatch && anonKeys) {
      const url = supabaseUrlMatch[0];
      const key = anonKeys[0];
      console.log('Trying Supabase client with URL:', url);
      
      // Let's test querying tables via REST API: /rest/v1/
      const testTables = ['readers', 'leaderboard', 'profiles', 'users', 'reading_logs', 'books', 'students', 'points', 'top_readers'];
      for (const t of testTables) {
        try {
          const res = await fetch(`${url}/rest/v1/${t}?select=*&limit=5`, {
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`
            }
          });
          console.log(`Table ${t} status:`, res.status);
          if (res.ok) {
            const data = await res.json();
            console.log(`Table ${t} data sample:`, JSON.stringify(data).slice(0, 300));
          }
        } catch (e) {
          console.error(`Error querying ${t}:`, e.message);
        }
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

check();
