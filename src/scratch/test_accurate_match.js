const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

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

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/mohmmed/g, 'mohammed')
    .replace(/muhammed/g, 'muhammad')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeClass(cls) {
  if (!cls) return '';
  const c = cls.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (c.includes('plustwo') || c.includes('12') || c.includes('+2')) return '+2';
  if (c.includes('plusone') || c.includes('11') || c.includes('+1')) return '+1';
  if (c.includes('10')) return '10';
  if (c.includes('9')) return '9';
  if (c.includes('8')) return '8';
  if (c.includes('7')) return '7';
  return c;
}

function matchStudent(readerName, readerClass, allStudents) {
  const rNorm = normalize(readerName);
  const rClassNorm = normalizeClass(readerClass);

  // 1. Exact normalized full name match
  const exactMatches = allStudents.filter(s => normalize(s.fullName) === rNorm);
  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1 && rClassNorm) {
    const classMatch = exactMatches.find(s => normalizeClass(s.class?.name) === rClassNorm);
    if (classMatch) return classMatch;
    return exactMatches[0];
  }

  // Tokenize
  const rWords = readerName.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const rMainWords = rWords.filter(w => !['MUHAMMED', 'MUHAMMAD', 'MOHAMMED', 'MOHMMED'].includes(w) && w.length >= 3);
  const rInitials = rWords.filter(w => w.length < 3 || ['MUHAMMED', 'MUHAMMAD', 'MOHAMMED', 'MOHMMED'].includes(w));

  let bestMatch = null;
  let highestScore = 0;

  for (const s of allStudents) {
    const sNorm = normalize(s.fullName);
    const sClassNorm = normalizeClass(s.class?.name);
    const sWords = s.fullName.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const sMainWords = sWords.filter(w => !['MUHAMMED', 'MUHAMMAD', 'MOHAMMED', 'MOHMMED'].includes(w) && w.length >= 3);

    let score = 0;

    // Check if main distinctive words match
    let mainWordsMatched = 0;
    for (const mw of rMainWords) {
      if (sMainWords.some(sw => sw === mw || sw.startsWith(mw) || mw.startsWith(sw))) {
        mainWordsMatched++;
        score += 10;
      }
    }

    if (rMainWords.length > 0 && mainWordsMatched === rMainWords.length) {
      score += 20; // Full main name match
    } else if (rMainWords.length > 0 && mainWordsMatched === 0) {
      continue; // No main word match
    }

    // Check class match
    if (rClassNorm && sClassNorm) {
      if (rClassNorm === sClassNorm) {
        score += 15;
      } else {
        score -= 10; // penalty for class mismatch
      }
    }

    // Check initials
    for (const init of rInitials) {
      if (sWords.includes(init)) score += 2;
    }

    if (score > highestScore && score >= 20) {
      highestScore = score;
      bestMatch = s;
    }
  }

  return bestMatch;
}

async function testFull() {
  const allStudents = await prisma.student.findMany({
    include: { class: true, school: true }
  });

  const booksMap = new Map(booksRes.map(b => [b.id, b]));
  const readers = new Map();

  for (const r of borrowRes) {
    const borrowerName = (r.borrower_name || '').trim();
    if (!borrowerName) continue;

    const student = readers.get(borrowerName) ?? {
      name: borrowerName,
      className: r.borrower_class || '',
      points: 0,
      fullRead: 0,
      halfRead: 0,
      reviewCount: 0,
    };
    if (!student.className && r.borrower_class) {
      student.className = r.borrower_class;
    }

    const book = booksMap.get(r.book_id);
    const pts = Q6(scoringTable, book?.category, book?.pages);

    if (r.read_status === 'full_read') {
      student.fullRead += 1;
      student.points += pts;
    } else if (r.read_status === 'half_read') {
      student.halfRead += 1;
      student.points += Math.round(pts / 2);
    }

    if (r.review_conducted) {
      student.reviewCount += 1;
      student.points += (r.review_points ?? reviewPointsDefault);
    }

    readers.set(borrowerName, student);
  }

  const sortedLeaderboard = Array.from(readers.values())
    .filter(s => s.points > 0 || s.fullRead > 0 || s.halfRead > 0)
    .sort((a, b) => b.points - a.points || b.fullRead - a.fullRead || a.name.localeCompare(b.name));

  console.log(`Computed ${sortedLeaderboard.length} scored readers.`);
  console.log('\n--- MATCHING VERIFICATION (Top 25) ---');
  sortedLeaderboard.slice(0, 25).forEach((r, idx) => {
    const match = matchStudent(r.name, r.className, allStudents);
    console.log(`#${idx + 1}: ${r.name} (${r.className}) - ${r.points} pts -> ${match ? `✅ "${match.fullName}" (${match.class?.name || 'No Class'})` : '❌ No Match'}`);
  });
}

testFull().catch(console.error).finally(() => prisma.$disconnect());
