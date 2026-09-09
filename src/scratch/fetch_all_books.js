const fs = require('fs');

async function fetchAllBooks() {
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard').then(r => r.text());
  const jsMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  const jsCode = await fetch('https://msoelibrary.vercel.app' + jsMatch[1]).then(r => r.text());
  const anonKeyMatch = jsCode.match(/eyJhbGciOi[a-zA-Z0-9_\-\.]+/);
  const anonKey = anonKeyMatch[0];
  const headers = { apikey: anonKey, Authorization: 'Bearer ' + anonKey };

  let allBooks = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(`https://lezoaunsbfgrbcskedoq.supabase.co/rest/v1/books?select=*&order=average_rating.desc&offset=${offset}&limit=1000`, { headers }).then(r => r.json());
    if (!Array.isArray(res) || res.length === 0) {
      hasMore = false;
    } else {
      allBooks = allBooks.concat(res);
      offset += res.length;
      if (res.length < 1000) hasMore = false;
    }
  }

  console.log('Total books fetched with pagination:', allBooks.length);
  fs.writeFileSync('src/scratch/all_books.json', JSON.stringify(allBooks, null, 2));
}

fetchAllBooks().catch(console.error);
