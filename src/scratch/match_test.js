const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function matchTest() {
  const SUPABASE_URL = 'https://lezoaunsbfgrbcskedoq.supabase.co';
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard').then(r => r.text());
  const jsCode = await fetch('https://msoelibrary.vercel.app' + html.match(/src="(\/assets\/[^"]+\.js)"/)[1]).then(r => r.text());
  const anonKey = jsCode.match(/eyJhbGciOi[a-zA-Z0-9_\-\.]+/)[0];
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  const [settingsRes, booksRes, borrowRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/admin_settings?select=*&limit=1`, { headers }).then(r => r.json()),
    fetch(`${SUPABASE_URL}/rest/v1/books?select=*&order=average_rating.desc&limit=10000`, { headers }).then(r => r.json()),
    fetch(`${SUPABASE_URL}/rest/v1/borrow_records?select=*&order=created_at.desc&limit=10000`, { headers }).then(r => r.json())
  ]);

  const settings = settingsRes[0] || {};
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

  const booksMap = new Map(booksRes.map(b => [b.id, b]));
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
      reviewCount: 0
    };

    if (!student.className && rec.borrower_class) {
      student.className = rec.borrower_class;
    }

    const book = booksMap.get(rec.book_id);
    const pts = Q6(scoringTable, book?.category, book?.pages);

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

  const leaderboard = Array.from(studentMap.values())
    .filter(s => s.points > 0 || s.fullRead > 0 || s.halfRead > 0)
    .sort((a, b) => b.points - a.points || b.fullRead - a.fullRead || a.name.localeCompare(b.name));

  const allSprStudents = await prisma.student.findMany({
    include: { class: true, school: true }
  });

  console.log(`Matching ${leaderboard.length} library readers against ${allSprStudents.length} SPR students...`);

  function normalize(str) {
    return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  for (let i = 0; i < leaderboard.length; i++) {
    const r = leaderboard[i];
    const rNorm = normalize(r.name);
    
    // Find best match
    let match = allSprStudents.find(s => normalize(s.fullName) === rNorm);
    if (!match) {
      match = allSprStudents.find(s => {
        const sNorm = normalize(s.fullName);
        return sNorm.includes(rNorm) || rNorm.includes(sNorm);
      });
    }

    console.log(`Rank ${i + 1}: "${r.name}" (${r.className}, ${r.points} pts, ${r.fullRead}f • ${r.halfRead}h) -> ${match ? `MATCHED: [${match.studentId}] ${match.fullName} (${match.class.name})` : 'NO EXACT MATCH (Will create/link profile)'}`);
  }
}

matchTest().finally(() => prisma.$disconnect());
