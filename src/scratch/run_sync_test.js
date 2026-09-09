const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LIBRARY_BASE_URL = 'https://msoelibrary.vercel.app';
const SUPABASE_REST_URL = 'https://lezoaunsbfgrbcskedoq.supabase.co';

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
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

async function fetchLibraryLeaderboard() {
  const html = await fetch(`${LIBRARY_BASE_URL}/leaderboard`).then((r) => r.text());
  const jsMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  if (!jsMatch) throw new Error('Could not locate JS bundle');

  const jsCode = await fetch(`${LIBRARY_BASE_URL}${jsMatch[1]}`).then((r) => r.text());
  const anonKeyMatch = jsCode.match(/eyJhbGciOi[a-zA-Z0-9_\-\.]+/);
  if (!anonKeyMatch) throw new Error('Could not retrieve anon key');

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

  const result = sortedLeaderboard.map((item, idx) => ({
    rank: idx + 1,
    name: item.name,
    className: item.className,
    points: item.points,
    fullRead: item.fullRead,
    halfRead: item.halfRead,
    reviewCount: item.reviewCount,
    totalBooks: item.fullRead + item.halfRead,
  }));

  return { settings, leaderboard: result };
}

async function syncToDB() {
  const { settings, leaderboard } = await fetchLibraryLeaderboard();
  const notice = settings.leaderboard_notice || "National Librarian's Day Leaderboard";
  const period = settings.leaderboard_from_date
    ? `From ${settings.leaderboard_from_date}${settings.leaderboard_visible_until ? ` to ${settings.leaderboard_visible_until}` : ''}`
    : 'Term 1 2026';

  const allSprStudents = await prisma.student.findMany({
    include: { class: true, school: true },
  });

  await prisma.libraryRecord.deleteMany({});

  let count = 0;
  for (const reader of leaderboard) {
    const rNorm = normalize(reader.name);

    let match = allSprStudents.find((s) => normalize(s.fullName) === rNorm);

    if (!match) {
      const words = reader.name.toUpperCase().split(/\s+/).filter((w) => w.length > 2 && w !== 'MUHAMMED' && w !== 'MUHAMMAD' && w !== 'MOHAMMED');
      if (words.length > 0) {
        match = allSprStudents.find((s) => {
          const sName = s.fullName.toUpperCase();
          return words.every((w) => sName.includes(w));
        });
      }
    }

    if (!match) {
      match = allSprStudents.find((s) => {
        const sNorm = normalize(s.fullName);
        return sNorm.includes(rNorm) || rNorm.includes(sNorm);
      });
    }

    if (match) {
      await prisma.libraryRecord.create({
        data: {
          studentId: match.id,
          booksRead: reader.totalBooks,
          readingScore: reader.points,
          readingRank: reader.rank,
          readingPeriod: `${period} • #${reader.rank} (${reader.points} pts)`,
        },
      });
      count++;
    }
  }

  await prisma.libraryIntegration.upsert({
    where: { id: (await prisma.libraryIntegration.findFirst())?.id || 'default' },
    update: {
      endpointUrl: 'https://msoelibrary.vercel.app/leaderboard',
      isConnected: true,
      lastSyncAt: new Date(),
      syncStatus: 'CONNECTED',
    },
    create: {
      endpointUrl: 'https://msoelibrary.vercel.app/leaderboard',
      isConnected: true,
      lastSyncAt: new Date(),
      syncStatus: 'CONNECTED',
    },
  });

  console.log(`Successfully synced ${count} of ${leaderboard.length} library leaderboard entries into SPR database!`);
}

syncToDB().finally(() => prisma.$disconnect());
