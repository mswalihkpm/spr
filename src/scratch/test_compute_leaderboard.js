const fs = require('fs');

async function runTest() {
  const SUPABASE_URL = 'https://lezoaunsbfgrbcskedoq.supabase.co';
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard').then(r => r.text());
  const jsFileMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  const jsCode = await fetch('https://msoelibrary.vercel.app' + jsFileMatch[1]).then(r => r.text());

  const anonKey = jsCode.match(/eyJhbGciOi[a-zA-Z0-9_\-\.]+/)[0];
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  const [settingsRes, booksRes, borrowRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/admin_settings?select=*&limit=1`, { headers }).then(r => r.json()),
    fetch(`${SUPABASE_URL}/rest/v1/books?select=*&limit=5000`, { headers }).then(r => r.json()),
    fetch(`${SUPABASE_URL}/rest/v1/borrow_records?select=*&limit=10000`, { headers }).then(r => r.json())
  ]);

  const settings = settingsRes[0] || {};
  const scoringTable = settings.scoring_table || {};
  const reviewPointsDefault = settings.review_points_default ?? 10;

  function getBookPoints(category, pages) {
    const catPoints = scoringTable[category || 'Others'] || scoringTable.Others || {};
    const pageNum = typeof pages === 'number' ? pages : parseInt(String(pages || '0').replace(/[^\d]/g, ''), 10) || 0;
    let pageBucket;
    if (pageNum < 50) pageBucket = 'b50';
    else if (pageNum < 100) pageBucket = 'b100';
    else if (pageNum < 150) pageBucket = 'b150';
    else if (pageNum < 200) pageBucket = 'b200';
    else if (pageNum < 250) pageBucket = 'b250';
    else if (pageNum <= 300) pageBucket = 'b300';
    else pageBucket = 'a300';

    return catPoints[pageBucket] ?? 0;
  }

  const booksMap = new Map(booksRes.map(b => [b.id, b]));

  // Leaderboard Calculation
  const studentMap = new Map();

  for (const record of borrowRes) {
    const borrowerName = (record.borrower_name || record.borrowerName || '').trim();
    if (!borrowerName) continue;

    const entry = studentMap.get(borrowerName) || {
      name: borrowerName,
      className: record.borrower_class || record.borrowerClass || '',
      points: 0,
      fullRead: 0,
      halfRead: 0,
      reviewCount: 0,
      totalBooks: 0
    };

    if (!entry.className && (record.borrower_class || record.borrowerClass)) {
      entry.className = record.borrower_class || record.borrowerClass;
    }

    const book = booksMap.get(record.book_id || record.bookId);
    const pts = getBookPoints(book?.category, book?.pages);

    const status = record.read_status || record.readStatus;
    if (status === 'full_read') {
      entry.fullRead += 1;
      entry.points += pts;
      entry.totalBooks += 1;
    } else if (status === 'half_read') {
      entry.halfRead += 1;
      entry.points += Math.round(pts / 2);
      entry.totalBooks += 1;
    }

    const reviewConducted = record.review_conducted || record.reviewConducted;
    if (reviewConducted) {
      entry.reviewCount += 1;
      const reviewPts = record.review_points ?? record.reviewPoints ?? reviewPointsDefault;
      entry.points += reviewPts;
    }

    studentMap.set(borrowerName, entry);
  }

  const leaderboard = Array.from(studentMap.values())
    .filter(s => s.points > 0 || s.fullRead > 0 || s.halfRead > 0)
    .sort((a, b) => b.points - a.points || b.fullRead - a.fullRead || a.name.localeCompare(b.name));

  console.log('Top 15 Readers from Library Leaderboard:');
  leaderboard.slice(0, 15).forEach((r, idx) => {
    console.log(`${idx + 1}. ${r.name} (${r.className}) - ${r.points} pts, ${r.fullRead} full, ${r.halfRead} half, total books: ${r.totalBooks}`);
  });
}

runTest();
