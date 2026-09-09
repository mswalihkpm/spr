const fs = require('fs');

async function testExactLeaderboard() {
  const SUPABASE_URL = 'https://lezoaunsbfgrbcskedoq.supabase.co';
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard').then(r => r.text());
  const jsFileMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  const jsCode = await fetch('https://msoelibrary.vercel.app' + jsFileMatch[1]).then(r => r.text());
  const anonKey = jsCode.match(/eyJhbGciOi[a-zA-Z0-9_\-\.]+/)[0];
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  // Fetch all borrow_records using limit=10000
  const borrowRecords = await fetch(`${SUPABASE_URL}/rest/v1/borrow_records?select=*&order=created_at.desc&limit=10000`, {
    headers
  }).then(r => r.json());

  // Fetch all books with limit=10000
  const books = await fetch(`${SUPABASE_URL}/rest/v1/books?select=*&order=average_rating.desc&limit=10000`, {
    headers
  }).then(r => r.json());

  // Fetch settings
  const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/admin_settings?select=*&limit=1`, { headers });
  const settingsData = await settingsRes.json();
  const settings = settingsData[0] || {};
  const scoringTable = settings.scoring_table || {};
  const reviewPointsDefault = settings.review_points_default ?? 10;

  function Q6(scoring, category, pages) {
    const catPoints = scoring[category || "Others"] || scoring.Others || {};
    const pageNum = typeof pages === "number" ? pages : parseInt(String(pages || "0").replace(/[^\d]/g, ""), 10) || 0;
    let a;
    if (pageNum < 50) a = "b50";
    else if (pageNum < 100) a = "b100";
    else if (pageNum < 150) a = "b150";
    else if (pageNum < 200) a = "b200";
    else if (pageNum < 250) a = "b250";
    else if (pageNum <= 300) a = "b300";
    else a = "a300";
    return catPoints[a] ?? 0;
  }

  function vK(records, booksList, scoring, reviewPtsDef) {
    const booksMap = new Map(booksList.map(b => [b.id, b]));
    const studentMap = new Map();

    for (const rec of records) {
      const borrowerName = (rec.borrower_name || '').trim();
      if (!borrowerName) continue;

      const student = studentMap.get(borrowerName) ?? {
        name: borrowerName,
        className: rec.borrower_class || '',
        points: 0,
        fullRead: 0,
        halfRead: 0,
        reviewCount: 0
      };

      if (!student.className && rec.borrower_class) {
        student.className = rec.borrower_class;
      }

      const book = booksMap.get(rec.book_id);
      const pts = Q6(scoring, book?.category, book?.pages);

      if (rec.read_status === 'full_read') {
        student.fullRead += 1;
        student.points += pts;
      } else if (rec.read_status === 'half_read') {
        student.halfRead += 1;
        student.points += Math.round(pts / 2);
      }

      if (rec.review_conducted) {
        student.reviewCount += 1;
        student.points += (rec.review_points ?? reviewPtsDef);
      }

      studentMap.set(borrowerName, student);
    }

    return Array.from(studentMap.values())
      .filter(s => s.points > 0 || s.fullRead > 0 || s.halfRead > 0)
      .sort((a, b) => b.points - a.points || b.fullRead - a.fullRead || a.name.localeCompare(b.name));
  }

  console.log(`Fetched ${borrowRecords.length} borrow records, ${books.length} books`);
  const leaderboard = vK(borrowRecords, books, scoringTable, reviewPointsDefault);
  console.log('Leaderboard count:', leaderboard.length);
  leaderboard.forEach((r, idx) => {
    console.log(`Rank ${idx + 1}: ${r.name} (${r.className}) -> ${r.points} pts, ${r.fullRead}f • ${r.halfRead}h`);
  });
}

testExactLeaderboard();
