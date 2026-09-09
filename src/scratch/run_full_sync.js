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
  const c = cls.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (c.includes('plustwo') || c.includes('12') || c.includes('+2')) return '+2';
  if (c.includes('plusone') || c.includes('11') || c.includes('+1')) return '+1';
  if (c.includes('10')) return '10';
  if (c.includes('9')) return '9';
  if (c.includes('8')) return '8';
  if (c.includes('7')) return '7';
  return c;
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

async function fetchAllSupabase(endpoint, headers) {
  let allRows = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${SUPABASE_REST_URL}/rest/v1/${endpoint}${endpoint.includes('?') ? '&' : '?'}offset=${offset}&limit=1000`;
    const res = await fetch(url, { headers, cache: 'no-store' }).then((r) => r.json());
    if (!Array.isArray(res) || res.length === 0) {
      hasMore = false;
    } else {
      allRows = allRows.concat(res);
      offset += res.length;
      if (res.length < 1000) hasMore = false;
    }
  }
  return allRows;
}

function matchStudent(readerName, readerClass, allStudents) {
  const rNorm = normalize(readerName);
  const rClassNorm = normalizeClass(readerClass);

  // 1. Exact normalized full name match
  const exactMatches = allStudents.filter((s) => normalize(s.fullName) === rNorm);
  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1 && rClassNorm) {
    const classMatch = exactMatches.find((s) => normalizeClass(s.class?.name) === rClassNorm);
    if (classMatch) return classMatch;
    return exactMatches[0];
  }

  // Tokenize
  const rWords = readerName.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const rMainWords = rWords.filter((w) => !['MUHAMMED', 'MUHAMMAD', 'MOHAMMED', 'MOHMMED'].includes(w) && w.length >= 3);
  const rInitials = rWords.filter((w) => w.length < 3 || ['MUHAMMED', 'MUHAMMAD', 'MOHAMMED', 'MOHMMED'].includes(w));

  let bestMatch = null;
  let highestScore = 0;

  for (const s of allStudents) {
    const sNorm = normalize(s.fullName);
    const sClassNorm = normalizeClass(s.class?.name);
    const sWords = s.fullName.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const sMainWords = sWords.filter((w) => !['MUHAMMED', 'MUHAMMAD', 'MOHAMMED', 'MOHMMED'].includes(w) && w.length >= 3);

    let score = 0;

    // Check if main distinctive words match
    let mainWordsMatched = 0;
    for (const mw of rMainWords) {
      if (sMainWords.some((sw) => sw === mw || sw.startsWith(mw) || mw.startsWith(sw))) {
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

async function testSync() {
  const html = await fetch(`${LIBRARY_BASE_URL}/leaderboard`, { cache: 'no-store' }).then((r) => r.text());
  const jsMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  const jsCode = await fetch(`${LIBRARY_BASE_URL}${jsMatch[1]}`, { cache: 'no-store' }).then((r) => r.text());
  const anonKeyMatch = jsCode.match(/eyJhbGciOi[a-zA-Z0-9_\-\.]+/);
  const anonKey = anonKeyMatch[0];
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  const [settingsRes, booksRes, borrowRes] = await Promise.all([
    fetch(`${SUPABASE_REST_URL}/rest/v1/admin_settings?select=*&limit=1`, { headers, cache: 'no-store' }).then((r) => r.json()),
    fetchAllSupabase('books?select=*&order=average_rating.desc', headers),
    fetchAllSupabase('borrow_records?select=*&order=created_at.desc', headers),
  ]);

  const settings = settingsRes?.[0] || {};
  const scoringTable = settings.scoring_table || {};
  const reviewPointsDefault = settings.review_points_default ?? 10;
  const booksMap = new Map(booksRes.map((b) => [b.id, b]));

  const studentMap = new Map();

  for (const rec of borrowRes) {
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

  const allSprStudents = await prisma.student.findMany({
    include: { class: true, school: true },
  });

  const defaultSchool = await prisma.school.findFirst();
  const classes = await prisma.academicClass.findMany();
  const academicYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });

  console.log(`\n=== SYNCING ${sortedLeaderboard.length} READERS TO SPR DATABASE ===`);

  // Clear existing library records
  await prisma.libraryRecord.deleteMany({});

  let syncedCount = 0;

  for (let idx = 0; idx < sortedLeaderboard.length; idx++) {
    const reader = sortedLeaderboard[idx];
    const rank = idx + 1;
    let student = matchStudent(reader.name, reader.className, allSprStudents);

    if (!student) {
      // Find matching class ID in SPR
      const normCls = normalizeClass(reader.className);
      const matchedClass = classes.find((c) => normalizeClass(c.name) === normCls) || classes[0];

      // Auto-create student in SPR so the reader is not omitted from rankings
      student = await prisma.student.create({
        data: {
          studentId: `LIB-${String(syncedCount + 1).padStart(3, '0')}`,
          fullName: reader.name.toUpperCase(),
          classId: matchedClass?.id,
          schoolId: defaultSchool?.id,
          academicYearId: academicYear?.id,
          status: 'ACTIVE',
        },
        include: { class: true, school: true },
      });
      allSprStudents.push(student);
      console.log(`[Auto-Created Student] ${student.fullName} (${student.class?.name || 'Class'})`);
    }

    const period = settings.leaderboard_from_date
      ? `From ${settings.leaderboard_from_date}${settings.leaderboard_visible_until ? ` to ${settings.leaderboard_visible_until}` : ''}`
      : 'Term 1 2026';

    await prisma.libraryRecord.create({
      data: {
        studentId: student.id,
        booksRead: reader.fullRead + reader.halfRead,
        readingScore: reader.points,
        readingRank: rank,
        readingPeriod: `${period} • #${rank} (${reader.points} pts)`,
      },
    });

    console.log(`Rank #${rank}: ${student.fullName} (${student.class?.name || 'Class'}) -> ${reader.points} pts | ${reader.fullRead}f • ${reader.halfRead}h`);
    syncedCount++;
  }

  // Update integration
  const integration = await prisma.libraryIntegration.findFirst();
  if (integration) {
    await prisma.libraryIntegration.update({
      where: { id: integration.id },
      data: {
        endpointUrl: 'https://msoelibrary.vercel.app/leaderboard',
        isConnected: true,
        lastSyncAt: new Date(),
        syncStatus: 'CONNECTED',
      },
    });
  }

  console.log(`\nSuccessfully synchronized ${syncedCount} records.`);
}

testSync().catch(console.error).finally(() => prisma.$disconnect());
