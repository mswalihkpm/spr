const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LIBRARY_BASE_URL = 'https://msoelibrary.vercel.app';
const SUPABASE_REST_URL = 'https://lezoaunsbfgrbcskedoq.supabase.co';

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/mohmmed/g, 'mohammed')
    .replace(/muhammed/g, 'muhammad')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeClass(cls) {
  if (!cls) return '';
  const c = cls.toString().toLowerCase().trim();
  if (c.includes('plus two') || c.includes('+2') || c.includes('12') || c.includes('plus 2') || c.includes('plustwo')) return '+2';
  if (c.includes('plus one') || c.includes('+1') || c.includes('11') || c.includes('plus 1') || c.includes('plusone')) return '+1';
  if (c.includes('10')) return '10';
  if (c.includes('9')) return '9';
  if (c.includes('8')) return '8';
  if (c.includes('7')) return '7';
  return c.replace(/[^a-z0-9]/g, '');
}

function getPageBucket(pages) {
  const pageNum = typeof pages === 'number' ? pages : parseInt(String(pages || '0').replace(/[^\d]/g, ''), 10) || 0;
  if (pageNum < 50) return 'b50';
  if (pageNum < 100) return 'b100';
  if (pageNum < 150) return 'b150';
  if (pageNum < 200) return 'b200';
  if (pageNum < 250) return 'b250';
  if (pageNum <= 300) return 'b300';
  return 'a300';
}

function calculateBookPoints(scoringTable, category, pages) {
  const catPoints = scoringTable?.[category || 'Others'] || scoringTable?.Others || {};
  const bucket = getPageBucket(pages);
  return catPoints[bucket] ?? 0;
}

function matchStudent(readerName, readerClass, allStudents) {
  const rNorm = normalize(readerName);
  const rClassNorm = normalizeClass(readerClass);

  const exactMatches = allStudents.filter((s) => normalize(s.fullName) === rNorm);
  if (exactMatches.length === 1 && (!rClassNorm || normalizeClass(exactMatches[0]?.class?.name) === rClassNorm)) {
    return exactMatches[0];
  }
  if (exactMatches.length > 0 && rClassNorm) {
    const classMatch = exactMatches.find((s) => normalizeClass(s.class?.name) === rClassNorm);
    if (classMatch) return classMatch;
  }

  const rWords = readerName.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const rMainWords = rWords.filter((w) => !['MUHAMMED', 'MUHAMMAD', 'MOHAMMED', 'MOHMMED', 'SAYYID'].includes(w) && w.length >= 3);
  const rInitials = rWords.filter((w) => w.length < 3 || ['MUHAMMED', 'MUHAMMAD', 'MOHAMMED', 'MOHMMED', 'SAYYID'].includes(w));

  let bestMatch = null;
  let highestScore = 0;

  for (const s of allStudents) {
    const sClassNorm = normalizeClass(s.class?.name);
    const sWords = s.fullName.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const sMainWords = sWords.filter((w) => !['MUHAMMED', 'MUHAMMAD', 'MOHAMMED', 'MOHMMED', 'SAYYID'].includes(w) && w.length >= 3);

    let score = 0;
    let mainWordsMatched = 0;
    for (const mw of rMainWords) {
      if (sMainWords.some((sw) => sw === mw || sw.startsWith(mw) || mw.startsWith(sw) || (mw.length > 4 && sw.includes(mw)) || (sw.length > 4 && mw.includes(sw)))) {
        mainWordsMatched++;
        score += 15;
      }
    }

    if (rMainWords.length > 0 && mainWordsMatched === rMainWords.length) {
      score += 25;
    } else if (rMainWords.length > 0 && mainWordsMatched === 0) {
      continue;
    }

    if (rClassNorm && sClassNorm) {
      if (rClassNorm === sClassNorm) {
        score += 20;
      } else {
        score -= 30;
      }
    }

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

async function main() {
  console.log('Fetching MSOE library data...');
  const html = await fetch(`${LIBRARY_BASE_URL}/leaderboard`, { cache: 'no-store' }).then((r) => r.text());
  const jsMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  if (!jsMatch) throw new Error('No JS bundle found');
  const jsCode = await fetch(`${LIBRARY_BASE_URL}${jsMatch[1]}`, { cache: 'no-store' }).then((r) => r.text());
  const anonKeyMatch = jsCode.match(/eyJhbGciOi[a-zA-Z0-9_\-\.]+/);
  if (!anonKeyMatch) throw new Error('No anon key found');
  const anonKey = anonKeyMatch[0];
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  const [settingsRes, booksRes, borrowRes] = await Promise.all([
    fetch(`${SUPABASE_REST_URL}/rest/v1/admin_settings?select=*&limit=1`, { headers }).then((r) => r.json()),
    fetch(`${SUPABASE_REST_URL}/rest/v1/books?select=*&order=average_rating.desc&limit=10000`, { headers }).then((r) => r.json()),
    fetch(`${SUPABASE_REST_URL}/rest/v1/borrow_records?select=*&order=created_at.desc&limit=10000`, { headers }).then((r) => r.json()),
  ]);

  const settings = settingsRes?.[0] || {};
  const scoringTable = settings.scoring_table || {};
  const reviewPointsDefault = settings.review_points_default ?? 10;
  const period = settings.leaderboard_from_date
    ? `From ${settings.leaderboard_from_date}${settings.leaderboard_visible_until ? ` to ${settings.leaderboard_visible_until}` : ''}`
    : 'Term 1 2026';

  const booksMap = new Map((booksRes || []).map((b) => [b.id, b]));

  const studentMap = new Map();
  for (const rec of (borrowRes || [])) {
    const borrowerName = (rec.borrower_name || '').trim();
    if (!borrowerName) continue;
    const student = studentMap.get(borrowerName) ?? {
      name: borrowerName,
      className: rec.borrower_class || '',
      points: 0,
      fullRead: 0,
      halfRead: 0,
      reviewCount: 0,
    };
    if (!student.className && rec.borrower_class) {
      student.className = rec.borrower_class;
    }
    const book = booksMap.get(rec.book_id);
    const pts = calculateBookPoints(scoringTable, book?.category, book?.pages);
    if (rec.read_status === 'full_read') {
      student.fullRead += 1;
      student.points += pts;
    } else if (rec.read_status === 'half_read') {
      student.halfRead += 1;
      student.points += Math.round(pts / 2);
    }
    if (rec.review_conducted) {
      student.reviewCount += 1;
      student.points += (rec.review_points ?? reviewPointsDefault);
    }
    studentMap.set(borrowerName, student);
  }

  const sortedLeaderboard = Array.from(studentMap.values())
    .filter((s) => s.points > 0 || s.fullRead > 0 || s.halfRead > 0)
    .sort((a, b) => b.points - a.points || b.fullRead - a.fullRead || a.name.localeCompare(b.name));

  const allSprStudents = await prisma.student.findMany({ include: { class: true, school: true } });
  await prisma.libraryRecord.deleteMany({});

  const studentReaderMap = new Map();

  for (let idx = 0; idx < sortedLeaderboard.length; idx++) {
    const reader = sortedLeaderboard[idx];
    const rank = idx + 1;
    let student = matchStudent(reader.name, reader.className, allSprStudents);

    if (student) {
      if (studentReaderMap.has(student.id)) {
        const existing = studentReaderMap.get(student.id);
        existing.booksRead += (reader.fullRead + reader.halfRead);
        existing.points += reader.points;
        existing.bestRank = Math.min(existing.bestRank, rank);
      } else {
        studentReaderMap.set(student.id, {
          student,
          booksRead: (reader.fullRead + reader.halfRead),
          points: reader.points,
          bestRank: rank,
        });
      }
    }
  }

  let importedCount = 0;
  for (const entry of Array.from(studentReaderMap.values())) {
    await prisma.libraryRecord.create({
      data: {
        studentId: entry.student.id,
        booksRead: entry.booksRead,
        readingScore: entry.points,
        readingRank: entry.bestRank,
        readingPeriod: `${period} • #${entry.bestRank} (${entry.points} pts)`,
      },
    });
    importedCount++;
  }

  console.log(`✅ Library Sync complete! Total readers: ${sortedLeaderboard.length}, Consolidated SPR students: ${importedCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
