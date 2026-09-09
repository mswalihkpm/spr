const fs = require('fs');

const borrowRes = JSON.parse(fs.readFileSync('src/scratch/borrow_records.json', 'utf8'));
const booksRes = JSON.parse(fs.readFileSync('src/scratch/all_books.json', 'utf8'));
const settingsRes = JSON.parse(fs.readFileSync('src/scratch/settings.json', 'utf8'));

const settings = settingsRes[0];
const scoringTable = settings.scoring_table || {};
const reviewPointsDefault = settings.review_points_default ?? 10;

function Q6(table, category, pages) {
  const cat = table[category || 'Others'] || table.Others || {};
  const p = typeof pages === 'number' ? pages : parseInt(String(pages || '0').replace(/[^\d]/g, ''), 10) || 0;
  let bucket;
  if (p < 50) bucket = 'b50';
  else if (p < 100) bucket = 'b100';
  else if (p < 150) bucket = 'b150';
  else if (p < 200) bucket = 'b200';
  else if (p < 250) bucket = 'b250';
  else if (p <= 300) bucket = 'b300';
  else bucket = 'a300';
  return cat[bucket] ?? 0;
}

// Map borrow records exactly like ig()
const e = borrowRes.map(r => ({
  id: r.id,
  bookId: r.book_id,
  bookTitle: r.book_title,
  bookVolume: r.book_volume || undefined,
  borrowerName: r.borrower_name,
  borrowerClass: r.borrower_class || undefined,
  borrowedDate: r.borrowed_date,
  returnDate: r.return_date,
  isReturned: r.is_returned,
  readStatus: r.read_status || 'not_read',
  reviewConducted: !!r.review_conducted,
  reviewPoints: r.review_points ?? undefined,
  studentId: r.student_id || undefined,
}));

function vK(records, books, scoreTable, defReview) {
  const booksMap = new Map(books.map(b => [b.id, b]));
  const readers = new Map();

  for (const s of records) {
    const o = (s.borrowerName || '').trim();
    if (!o) continue;

    const l = readers.get(o) ?? {
      name: o,
      className: s.borrowerClass,
      points: 0,
      fullRead: 0,
      halfRead: 0,
      reviewCount: 0,
    };
    if (!l.className && s.borrowerClass) l.className = s.borrowerClass;

    const c = booksMap.get(s.bookId);
    const u = Q6(scoreTable, c?.category, c?.pages);

    if (s.readStatus === 'full_read') {
      l.fullRead += 1;
      l.points += u;
    } else if (s.readStatus === 'half_read') {
      l.halfRead += 1;
      l.points += Math.round(u / 2);
    }

    if (s.reviewConducted) {
      l.reviewCount += 1;
      l.points += (s.reviewPoints ?? defReview);
    }

    readers.set(o, l);
  }

  return Array.from(readers.values())
    .filter(s => s.points > 0 || s.fullRead > 0 || s.halfRead > 0)
    .sort((a, b) => b.points - a.points || b.fullRead - a.fullRead || a.name.localeCompare(b.name));
}

const leaderboard = vK(e, booksRes, scoringTable, reviewPointsDefault);

console.log('--- ALL TIME LEADERBOARD (Top 15) ---');
leaderboard.slice(0, 15).forEach((r, idx) => {
  console.log(`#${idx + 1}: ${r.name} (${r.className}) - ${r.points} pts | ${r.fullRead}f • ${r.halfRead}h | reviewCount: ${r.reviewCount}`);
});
