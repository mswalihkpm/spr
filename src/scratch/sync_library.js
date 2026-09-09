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

  const allSprStudents = await prisma.student.findMany();
  await prisma.libraryRecord.deleteMany({});

  let matched = 0;
  for (let idx = 0; idx < sortedLeaderboard.length; idx++) {
    const reader = sortedLeaderboard[idx];
    const rNorm = normalize(reader.name);
    let match = allSprStudents.find((s) => normalize(s.fullName) === rNorm);
    if (!match) {
      const rTokens = reader.name.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
      const distinctiveTokens = rTokens.filter((w) => !['MUHAMMED', 'MUHAMMAD', 'MOHAMMED', 'MOHMMED'].includes(w));
      if (distinctiveTokens.length > 0) {
        match = allSprStudents.find((s) => {
          const sTokens = s.fullName.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
          return distinctiveTokens.every((tok) => sTokens.some((st) => st.includes(tok) || tok.includes(st)));
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
          booksRead: reader.fullRead + reader.halfRead,
          readingScore: reader.points,
          readingRank: idx + 1,
          readingPeriod: `Library Official Standings • #${idx + 1} (${reader.points} pts)`,
        },
      });
      matched++;
    }
  }

  console.log(`✅ Library Sync complete! Total readers: ${sortedLeaderboard.length}, matched & synced to SPR: ${matched}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
