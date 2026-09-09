import { prisma } from './prisma';
import { invalidateEngineCache } from './spr-engine';

const LIBRARY_BASE_URL = 'https://msoelibrary.vercel.app';
const SUPABASE_REST_URL = 'https://lezoaunsbfgrbcskedoq.supabase.co';

function normalize(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/mohmmed/g, 'mohammed')
    .replace(/muhammed/g, 'muhammad')
    .replace(/[^a-z0-9]/g, '');
}

function getPageBucket(pages: number | string | undefined | null): string {
  const pageNum = typeof pages === 'number' ? pages : parseInt(String(pages || '0').replace(/[^\d]/g, ''), 10) || 0;
  if (pageNum < 50) return 'b50';
  if (pageNum < 100) return 'b100';
  if (pageNum < 150) return 'b150';
  if (pageNum < 200) return 'b200';
  if (pageNum < 250) return 'b250';
  if (pageNum <= 300) return 'b300';
  return 'a300';
}

function calculateBookPoints(scoringTable: any, category: string | undefined, pages: number | string | undefined): number {
  const catPoints = scoringTable?.[category || 'Others'] || scoringTable?.Others || {};
  const bucket = getPageBucket(pages);
  return catPoints[bucket] ?? 0;
}

export interface LibraryLeaderboardEntry {
  rank: number;
  name: string;
  className: string;
  points: number;
  fullRead: number;
  halfRead: number;
  reviewCount: number;
  totalBooks: number;
  sprStudentId?: string | null;
  sprStudentName?: string | null;
  sprClass?: string | null;
  sprSchool?: string | null;
}

export async function fetchLibraryLeaderboard(): Promise<{
  settings: any;
  leaderboard: LibraryLeaderboardEntry[];
  totalReaders: number;
}> {
  // 1. Fetch anon key from JS bundle
  const html = await fetch(`${LIBRARY_BASE_URL}/leaderboard`, { cache: 'no-store' }).then((r) => r.text());
  const jsMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  if (!jsMatch) {
    throw new Error('Could not locate JavaScript bundle from MSOE Library website.');
  }

  const jsCode = await fetch(`${LIBRARY_BASE_URL}${jsMatch[1]}`, { cache: 'no-store' }).then((r) => r.text());
  const anonKeyMatch = jsCode.match(/eyJhbGciOi[a-zA-Z0-9_\-\.]+/);
  if (!anonKeyMatch) {
    throw new Error('Could not retrieve API credentials for MSOE Library.');
  }
  const anonKey = anonKeyMatch[0];
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  // 2. Query settings, books, and borrow records
  const [settingsRes, booksRes, borrowRes] = await Promise.all([
    fetch(`${SUPABASE_REST_URL}/rest/v1/admin_settings?select=*&limit=1`, { headers, cache: 'no-store' }).then((r) => r.json()),
    fetch(`${SUPABASE_REST_URL}/rest/v1/books?select=*&order=average_rating.desc&limit=10000`, { headers, cache: 'no-store' }).then((r) => r.json()),
    fetch(`${SUPABASE_REST_URL}/rest/v1/borrow_records?select=*&order=created_at.desc&limit=10000`, { headers, cache: 'no-store' }).then((r) => r.json()),
  ]);

  const settings = settingsRes?.[0] || {};
  const scoringTable = settings.scoring_table || {};
  const reviewPointsDefault = settings.review_points_default ?? 10;
  const booksMap = new Map<string, any>((booksRes || []).map((b: any) => [b.id, b]));

  // 3. Compute exact Leaderboard scores
  const studentMap = new Map<string, any>();

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

  // Filter only readers with points or read books (Exact Leaderboard of Library Website)
  const sortedLeaderboard = Array.from(studentMap.values())
    .filter((s) => s.points > 0 || s.fullRead > 0 || s.halfRead > 0)
    .sort((a, b) => b.points - a.points || b.fullRead - a.fullRead || a.name.localeCompare(b.name));

  const result: LibraryLeaderboardEntry[] = sortedLeaderboard.map((item, idx) => ({
    rank: idx + 1,
    name: item.name,
    className: item.className,
    points: item.points,
    fullRead: item.fullRead,
    halfRead: item.halfRead,
    reviewCount: item.reviewCount,
    totalBooks: item.fullRead + item.halfRead,
  }));

  return {
    settings,
    leaderboard: result,
    totalReaders: result.length,
  };
}

export async function syncLibraryLeaderboardToSPR(): Promise<{
  importedCount: number;
  totalLeaderboardEntries: number;
  notice: string;
  leaderboard: LibraryLeaderboardEntry[];
}> {
  const { settings, leaderboard } = await fetchLibraryLeaderboard();
  const notice = settings.leaderboard_notice || "National Librarian's Day Leaderboard";
  const period = settings.leaderboard_from_date
    ? `From ${settings.leaderboard_from_date}${settings.leaderboard_visible_until ? ` to ${settings.leaderboard_visible_until}` : ''}`
    : 'Term 1 2026';

  const allSprStudents = await prisma.student.findMany({
    include: { class: true, school: true },
  });

  // Remove existing library records to only keep the verified leaderboard data
  await prisma.libraryRecord.deleteMany({});

  let importedCount = 0;

  for (const reader of leaderboard) {
    const rNorm = normalize(reader.name);

    // Matching priority
    let match = allSprStudents.find((s) => normalize(s.fullName) === rNorm);

    if (!match) {
      // Clean tokens
      const rTokens = reader.name.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
      const distinctiveTokens = rTokens.filter((w) => w !== 'MUHAMMED' && w !== 'MUHAMMAD' && w !== 'MOHAMMED' && w !== 'MOHMMED');

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
      reader.sprStudentId = match.id;
      reader.sprStudentName = match.fullName;
      reader.sprClass = match.class?.name;
      reader.sprSchool = match.school?.name;

      const readingScore = reader.points;

      await prisma.libraryRecord.create({
        data: {
          studentId: match.id,
          booksRead: reader.totalBooks,
          readingScore: readingScore,
          readingRank: reader.rank,
          readingPeriod: `${period} • #${reader.rank} (${reader.points} pts)`,
        },
      });
      importedCount++;
    }
  }

  // Update Integration status
  let integration = await prisma.libraryIntegration.findFirst();
  if (!integration) {
    await prisma.libraryIntegration.create({
      data: {
        endpointUrl: 'https://msoelibrary.vercel.app/leaderboard',
        isConnected: true,
        lastSyncAt: new Date(),
        syncStatus: 'CONNECTED',
      },
    });
  } else {
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

  invalidateEngineCache();

  return {
    importedCount,
    totalLeaderboardEntries: leaderboard.length,
    notice,
    leaderboard,
  };
}
