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

function normalizeClass(cls: string | undefined | null): string {
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

async function fetchAllSupabase(endpoint: string, headers: Record<string, string>): Promise<any[]> {
  let allRows: any[] = [];
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

export function matchStudent(readerName: string, readerClass: string | undefined, allStudents: any[]): any {
  const rNorm = normalize(readerName);
  const rClassNorm = normalizeClass(readerClass);

  // 1. Exact normalized full name match with class preference
  const exactMatches = allStudents.filter((s) => normalize(s.fullName) === rNorm);
  if (exactMatches.length === 1 && (!rClassNorm || normalizeClass(exactMatches[0]?.class?.name) === rClassNorm)) {
    return exactMatches[0];
  }
  if (exactMatches.length > 0 && rClassNorm) {
    const classMatch = exactMatches.find((s) => normalizeClass(s.class?.name) === rClassNorm);
    if (classMatch) return classMatch;
  }

  // Tokenize
  const rWords = readerName.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const rMainWords = rWords.filter((w: string) => !['MUHAMMED', 'MUHAMMAD', 'MOHAMMED', 'MOHMMED', 'SAYYID'].includes(w) && w.length >= 3);
  const rInitials = rWords.filter((w: string) => w.length < 3 || ['MUHAMMED', 'MUHAMMAD', 'MOHAMMED', 'MOHMMED', 'SAYYID'].includes(w));

  let bestMatch: any = null;
  let highestScore = 0;

  for (const s of allStudents) {
    const sClassNorm = normalizeClass(s.class?.name);
    const sWords: string[] = s.fullName.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const sMainWords = sWords.filter((w: string) => !['MUHAMMED', 'MUHAMMAD', 'MOHAMMED', 'MOHMMED', 'SAYYID'].includes(w) && w.length >= 3);

    let score = 0;

    // Check if main distinctive words match
    let mainWordsMatched = 0;
    for (const mw of rMainWords) {
      if (sMainWords.some((sw) => sw === mw || sw.startsWith(mw) || mw.startsWith(sw) || (mw.length > 4 && sw.includes(mw)) || (sw.length > 4 && mw.includes(sw)))) {
        mainWordsMatched++;
        score += 15;
      }
    }

    if (rMainWords.length > 0 && mainWordsMatched === rMainWords.length) {
      score += 25; // Full main name match
    } else if (rMainWords.length > 0 && mainWordsMatched === 0) {
      const fuzzyMatch = rMainWords.some((mw) =>
        sMainWords.some((sw) => mw.replace(/^H/, '') === sw.replace(/^H/, ''))
      );
      if (fuzzyMatch) {
        score += 15;
      } else {
        continue;
      }
    }

    // Check class match
    if (rClassNorm && sClassNorm) {
      if (rClassNorm === sClassNorm) {
        score += 20;
      } else {
        score -= 30; // Heavy penalty for class mismatch
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

  // 2. Query settings, books (paginated), and borrow records (paginated)
  const [settingsRes, booksRes, borrowRes] = await Promise.all([
    fetch(`${SUPABASE_REST_URL}/rest/v1/admin_settings?select=*&limit=1`, { headers, cache: 'no-store' }).then((r) => r.json()),
    fetchAllSupabase('books?select=*&order=average_rating.desc', headers),
    fetchAllSupabase('borrow_records?select=*&order=created_at.desc', headers),
  ]);

  const settings = settingsRes?.[0] || {};
  const scoringTable = settings.scoring_table || {};
  const reviewPointsDefault = settings.review_points_default ?? 10;
  const booksMap = new Map<string, any>((booksRes || []).map((b: any) => [b.id, b]));

  // 3. Compute exact Leaderboard scores identical to MSOE Library
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

  let defaultSchool = await prisma.school.findFirst();
  if (!defaultSchool) {
    defaultSchool = await prisma.school.create({
      data: { name: "Ma'din Higher Secondary School", code: 'MHSS' },
    });
  }

  const classes = await prisma.academicClass.findMany();
  let academicYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  if (!academicYear) {
    academicYear = await prisma.academicYear.findFirst() || await prisma.academicYear.create({
      data: { name: '2025-2026', isCurrent: true },
    });
  }

  // Remove existing library records to only keep the fresh, verified leaderboard data
  await prisma.libraryRecord.deleteMany({});

  // Group readers by matched SPR student to ensure single consolidated score per student
  const studentReaderMap = new Map<string, {
    student: any;
    booksRead: number;
    points: number;
    bestRank: number;
  }>();

  for (let idx = 0; idx < leaderboard.length; idx++) {
    const reader = leaderboard[idx];
    const rank = idx + 1;

    let student = matchStudent(reader.name, reader.className, allSprStudents);

    if (!student && classes.length > 0) {
      const normCls = normalizeClass(reader.className);
      const matchedClass = classes.find((c) => normalizeClass(c.name) === normCls) || classes[0];

      student = await prisma.student.create({
        data: {
          studentId: `LIB-${String(allSprStudents.length + 1).padStart(3, '0')}`,
          fullName: reader.name.toUpperCase(),
          classId: matchedClass.id,
          schoolId: defaultSchool.id,
          academicYearId: academicYear.id,
          status: 'ACTIVE',
        },
        include: { class: true, school: true },
      });
      allSprStudents.push(student);
    }

    reader.sprStudentId = student.id;
    reader.sprStudentName = student.fullName;
    reader.sprClass = student.class?.name;
    reader.sprSchool = student.school?.name;

    if (studentReaderMap.has(student.id)) {
      const existing = studentReaderMap.get(student.id)!;
      existing.booksRead += reader.totalBooks;
      existing.points += reader.points;
      existing.bestRank = Math.min(existing.bestRank, rank);
    } else {
      studentReaderMap.set(student.id, {
        student,
        booksRead: reader.totalBooks,
        points: reader.points,
        bestRank: rank,
      });
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
