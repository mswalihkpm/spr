import { prisma } from './prisma';
import { invalidateEngineCache } from './spr-engine';

const LIBRARY_BASE_URL = 'https://msoelibrary.vercel.app';
const SUPABASE_REST_URL = 'https://lezoaunsbfgrbcskedoq.supabase.co';

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

/**
 * Authoritative Student Matching by Exact SPR ID Only.
 * NEVER uses name, fuzzy matching, class, or school.
 */
export function matchStudentBySprId(sprId: string | undefined | null, allSprStudents: any[]): any {
  if (!sprId || typeof sprId !== 'string') return null;
  const normalized = sprId.trim().toUpperCase();
  if (!normalized) return null;
  return allSprStudents.find(
    (s) => s.sprStudentId && s.sprStudentId.trim().toUpperCase() === normalized
  ) || null;
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

  // 2. Query settings, books (paginated), borrow records (paginated), and students (paginated)
  const [settingsRes, booksRes, borrowRes, studentsRes] = await Promise.all([
    fetch(`${SUPABASE_REST_URL}/rest/v1/admin_settings?select=*&limit=1`, { headers, cache: 'no-store' }).then((r) => r.json()),
    fetchAllSupabase('books?select=*&order=average_rating.desc', headers),
    fetchAllSupabase('borrow_records?select=*&order=created_at.desc', headers),
    fetchAllSupabase('students?select=*&order=name.asc', headers),
  ]);

  const settings = settingsRes?.[0] || {};
  const scoringTable = settings.scoring_table || {};
  const reviewPointsDefault = settings.review_points_default ?? 10;
  const booksMap = new Map<string, any>((booksRes || []).map((b: any) => [b.id, b]));
  const studentsMap = new Map<string, any>((studentsRes || []).map((s: any) => [s.id, s]));

  // 3. Compute exact Leaderboard scores identical to MSOE Library
  const studentMap = new Map<string, any>();

  for (const rec of (borrowRes || [])) {
    const borrowerName = (rec.borrower_name || '').trim();
    if (!borrowerName) continue;

    const studentObj = rec.student_id ? studentsMap.get(rec.student_id) : null;
    const sprStudentId = studentObj?.spr_student_id ? studentObj.spr_student_id.trim().toUpperCase() : null;

    const groupKey = rec.student_id ? `id:${rec.student_id}` : `name:${borrowerName}`;

    const student = studentMap.get(groupKey) ?? {
      studentId: rec.student_id || null,
      name: borrowerName,
      className: rec.borrower_class || studentObj?.class || '',
      sprStudentId: sprStudentId,
      points: 0,
      fullRead: 0,
      halfRead: 0,
      reviewCount: 0,
    };

    if (!student.sprStudentId && sprStudentId) {
      student.sprStudentId = sprStudentId;
    }

    if (!student.className && (rec.borrower_class || studentObj?.class)) {
      student.className = rec.borrower_class || studentObj?.class || '';
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

    studentMap.set(groupKey, student);
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
    sprStudentId: item.sprStudentId || null,
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
  skippedWithoutSprIdCount: number;
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

  // Group readers strictly by exact SPR ID match
  const studentReaderMap = new Map<string, {
    student: any;
    booksRead: number;
    points: number;
    libraryRank: number;
  }>();

  let skippedWithoutSprIdCount = 0;

  for (let idx = 0; idx < leaderboard.length; idx++) {
    const reader = leaderboard[idx];

    // Rule 4: If reader does not have an SPR ID -> DO NOT SYNCHRONIZE
    if (!reader.sprStudentId || reader.sprStudentId.trim().length === 0) {
      skippedWithoutSprIdCount++;
      continue;
    }

    // Rule 3 & 5: Exact SPR ID match ONLY
    const student = matchStudentBySprId(reader.sprStudentId, allSprStudents);

    if (student) {
      reader.sprStudentName = student.fullName;
      reader.sprClass = student.class?.name;
      reader.sprSchool = student.school?.name;

      if (studentReaderMap.has(student.id)) {
        const existing = studentReaderMap.get(student.id)!;
        existing.booksRead += reader.totalBooks;
        existing.points += reader.points;
      } else {
        studentReaderMap.set(student.id, {
          student,
          booksRead: reader.totalBooks,
          points: reader.points,
          libraryRank: reader.rank,
        });
      }
    } else {
      // SPR ID present on library but not found in SPR database -> skip (do not create dummy students)
      skippedWithoutSprIdCount++;
    }
  }

  let importedCount = 0;

  for (const entry of Array.from(studentReaderMap.values())) {
    // Check if record exists for this student to safely update or create without deleting existing table data
    const existingRecord = await prisma.libraryRecord.findFirst({
      where: { studentId: entry.student.id },
    });

    if (existingRecord) {
      await prisma.libraryRecord.update({
        where: { id: existingRecord.id },
        data: {
          booksRead: entry.booksRead,
          readingScore: entry.points,
          readingRank: entry.libraryRank,
          readingPeriod: `${period} • #${entry.libraryRank} (${entry.points} pts)`,
        },
      });
    } else {
      await prisma.libraryRecord.create({
        data: {
          studentId: entry.student.id,
          booksRead: entry.booksRead,
          readingScore: entry.points,
          readingRank: entry.libraryRank,
          readingPeriod: `${period} • #${entry.libraryRank} (${entry.points} pts)`,
        },
      });
    }
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
    skippedWithoutSprIdCount,
    notice,
    leaderboard,
  };
}
