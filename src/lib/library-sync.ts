import { prisma } from './prisma';
import { invalidateEngineCache } from './spr-engine';
import { isValidSprId, normalizeSprId } from './spr-id';

const LIBRARY_BASE_URL = 'https://msoelibrary.vercel.app';
const SUPABASE_REST_URL = 'https://lezoaunsbfgrbcskedoq.supabase.co';

const lx = (e: any): number => {
  if (typeof e === 'number') return Number.isFinite(e) ? e : 0;
  const t = Number.parseInt(String(e ?? '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(t) ? t : 0;
};

const K0 = (pages: number, rate: number): number =>
  Math.round(((pages / 10) * rate + Number.EPSILON) * 1e6) / 1e6;

const cx = (points: number): number =>
  Math.round((points + Number.EPSILON) * 1e6) / 1e6;

const r5 = (rateList: any[], category: string | undefined, date: Date = new Date()): any => {
  const findCat = (catName: string) =>
    rateList
      .filter((a) => a.category === catName && new Date(a.effective_from || a.effectiveFrom).getTime() <= date.getTime())
      .sort((a, b) => new Date(b.effective_from || b.effectiveFrom).getTime() - new Date(a.effective_from || a.effectiveFrom).getTime())[0];
  return findCat(category || 'Others') ?? findCat('Others');
};

const n5 = (rec: any): string => {
  if (rec.return_option) return rec.return_option;
  if (rec.read_status === 'full_read') return 'full_read';
  if (rec.read_status === 'half_read') {
    return rec.pages_read && rec.pages_read > 0 ? 'custom_page' : 'half_read';
  }
  return 'not_read';
};

const ny = (rec: any, book: any, rateList: any[]): { value: number; versionId?: string } => {
  if (rec.rate_used !== undefined && rec.rate_used !== null && rec.rate_version_id) {
    return { value: Number(rec.rate_used), versionId: rec.rate_version_id };
  }
  const matched = r5(rateList, book?.category);
  return {
    value: Number(matched?.points_per_10_pages ?? matched?.pointsPer10Pages ?? 0),
    versionId: matched?.id,
  };
};

const i5 = (book: any, opt: string, pagesRead: any, rateObj: { value: number; versionId?: string }) => {
  const totalPages = lx(book?.pages);
  const maxPts = K0(totalPages, rateObj.value);
  const meta = { rateUsed: rateObj.value, rateVersionId: rateObj.versionId, maxPossiblePoints: maxPts };
  switch (opt) {
    case 'full_read':
      return { ...meta, calculatedPoints: maxPts };
    case 'half_read':
      return { ...meta, calculatedPoints: cx(maxPts / 2) };
    case 'custom_page': {
      const readCount = Math.max(0, pagesRead ?? 0);
      return { ...meta, calculatedPoints: K0(readCount, rateObj.value) };
    }
    default:
      return { ...meta, calculatedPoints: 0 };
  }
};

const YF = (rec: any, book: any, rateList: any[]): number => {
  if (rec.calculated_points !== undefined && rec.calculated_points !== null) {
    return Number(rec.calculated_points);
  }
  const opt = n5(rec);
  if (opt === 'not_read') return 0;
  return i5(book, opt, rec.pages_read, ny(rec, book, rateList)).calculatedPoints;
};

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
 * NEVER uses name, class, spelling similarity, or any other field.
 */
export function matchStudentBySprId(sprId: string | undefined | null, allSprStudents: any[]): any {
  if (!sprId || typeof sprId !== 'string') return null;
  const normalized = normalizeSprId(sprId);
  if (!isValidSprId(normalized)) return null;
  return allSprStudents.find(
    (s) => s.sprStudentId && normalizeSprId(s.sprStudentId) === normalized
  ) || null;
}

let cachedLibraryLeaderboard: { timestamp: number; data: any } | null = null;
const LIBRARY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

export function invalidateLibraryCache() {
  cachedLibraryLeaderboard = null;
}

export async function fetchLibraryLeaderboard(forceRefresh = false): Promise<{
  settings: any;
  leaderboard: LibraryLeaderboardEntry[];
  totalReaders: number;
}> {
  const now = Date.now();
  if (!forceRefresh && cachedLibraryLeaderboard && now - cachedLibraryLeaderboard.timestamp < LIBRARY_CACHE_TTL_MS) {
    return cachedLibraryLeaderboard.data;
  }

  // 1. Fetch anon key from JS bundle
  const html = await fetch(`${LIBRARY_BASE_URL}/leaderboard`, { next: { revalidate: 3600 } }).then((r) => r.text());
  const jsMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  if (!jsMatch) {
    throw new Error('Could not locate JavaScript bundle from MSOE Library website.');
  }

  const jsCode = await fetch(`${LIBRARY_BASE_URL}${jsMatch[1]}`, { next: { revalidate: 3600 } }).then((r) => r.text());
  const anonKeyMatch = jsCode.match(/eyJhbGciOi[a-zA-Z0-9_\-\.]+/);
  if (!anonKeyMatch) {
    throw new Error('Could not retrieve API credentials for MSOE Library.');
  }
  const anonKey = anonKeyMatch[0];
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  // 2. Query settings, books, borrow records, students, and rate versions with ONLY REQUIRED COLUMNS
  const [settingsRes, booksRes, borrowRes, studentsRes, ratesRes] = await Promise.all([
    fetch(`${SUPABASE_REST_URL}/rest/v1/admin_settings?select=review_points_default&limit=1`, { headers, next: { revalidate: 600 } }).then((r) => r.json()),
    fetchAllSupabase('books?select=id,category,pages&order=average_rating.desc', headers),
    fetchAllSupabase('borrow_records?select=borrower_name,student_id,book_id,return_option,read_status,pages_read,calculated_points,rate_used,rate_version_id,review_conducted,review_points,borrower_class&order=created_at.desc', headers),
    fetchAllSupabase('students?select=id,name,class,spr_student_id&order=name.asc', headers),
    fetchAllSupabase('reading_rate_versions?select=id,category,points_per_10_pages,effective_from&order=effective_from.desc', headers),
  ]);

  const settings = settingsRes?.[0] || {};
  const reviewPointsDefault = settings.review_points_default ?? 1;
  const booksMap = new Map<string, any>((booksRes || []).map((b: any) => [b.id, b]));
  const studentsMap = new Map<string, any>((studentsRes || []).map((s: any) => [s.id, s]));
  const studentsByName = new Map<string, any>(
    (studentsRes || []).map((s: any) => [(s.name || '').trim().toLowerCase(), s])
  );
  const ratesList = ratesRes || [];

  // 3. Compute exact Leaderboard scores identical to MSOE Library
  const studentMap = new Map<string, any>();

  for (const rec of (borrowRes || [])) {
    const borrowerName = (rec.borrower_name || '').trim();
    if (!borrowerName) continue;

    let studentObj = rec.student_id ? studentsMap.get(rec.student_id) : null;
    if (!studentObj) {
      studentObj = studentsByName.get(borrowerName.toLowerCase()) || null;
    }

    const rawSprId = studentObj?.spr_student_id ? String(studentObj.spr_student_id).trim() : null;
    const sprStudentId = rawSprId && isValidSprId(rawSprId) ? normalizeSprId(rawSprId) : null;

    const groupKey = studentObj?.id ? `id:${studentObj.id}` : `name:${borrowerName}`;

    const student = studentMap.get(groupKey) ?? {
      studentId: studentObj?.id || rec.student_id || null,
      name: studentObj?.name || borrowerName,
      className: studentObj?.class || rec.borrower_class || '',
      sprStudentId: sprStudentId,
      points: 0,
      fullRead: 0,
      halfRead: 0,
      reviewCount: 0,
    };

    if (!student.sprStudentId && sprStudentId) {
      student.sprStudentId = sprStudentId;
    }

    if (!student.className && (studentObj?.class || rec.borrower_class)) {
      student.className = studentObj?.class || rec.borrower_class || '';
    }

    const book = booksMap.get(rec.book_id);
    const opt = n5(rec);

    if (opt === 'full_read' || rec.read_status === 'full_read') {
      student.fullRead += 1;
    } else if (opt === 'half_read' || opt === 'custom_page' || rec.read_status === 'half_read') {
      student.halfRead += 1;
    }

    if (rec.calculated_points !== undefined && rec.calculated_points !== null) {
      student.points += Number(rec.calculated_points);
    } else if (ratesList.length > 0) {
      student.points += YF(rec, book, ratesList);
    }

    if (rec.review_conducted) {
      student.reviewCount += 1;
      student.points += (rec.review_points ?? reviewPointsDefault);
    }

    studentMap.set(groupKey, student);
  }

  // Round points cleanly to 2 decimal places to match site display
  studentMap.forEach((student) => {
    student.points = Number(cx(student.points).toFixed(2));
  });

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

/**
 * Synchronize Library Leaderboard to SPR.
 *
 * Rules:
 * 1. Only include Library Leaderboard students who already have a valid SPR ID.
 * 2. SPR ID is the ONLY eligibility/matching key.
 * 3. If a Library student has NO SPR ID -> completely exclude them from the SPR sync list/results.
 * 4. Never match using name, class, spelling similarity, or any guessed identity.
 * 5. Do not create new SPR IDs or new students during sync.
 * 6. Do not delete, modify, or overwrite any existing SPR or Library data.
 */
export async function syncLibraryLeaderboardToSPR(): Promise<{
  importedCount: number;
  totalLeaderboardEntries: number;
  eligibleLeaderboardCount: number;
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

  // Filter: Only include Library students who already have a valid SPR ID
  const eligibleReaders = leaderboard.filter(
    (reader) => reader.sprStudentId && isValidSprId(reader.sprStudentId)
  );

  const syncedLeaderboardEntries: LibraryLeaderboardEntry[] = [];
  const studentReaderMap = new Map<string, {
    student: any;
    booksRead: number;
    points: number;
    libraryRank: number;
  }>();

  for (const reader of eligibleReaders) {
    // Match SPR student strictly by exact SPR ID
    const student = matchStudentBySprId(reader.sprStudentId, allSprStudents);

    if (student) {
      reader.sprStudentName = student.fullName;
      reader.sprClass = student.class?.name;
      reader.sprSchool = student.school?.name;
      syncedLeaderboardEntries.push(reader);

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
    }
  }

  let importedCount = 0;

  for (const entry of Array.from(studentReaderMap.values())) {
    // Safely update or create library record for this student without deleting existing table data
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

  invalidateLibraryCache();
  invalidateEngineCache();

  return {
    importedCount,
    totalLeaderboardEntries: leaderboard.length,
    eligibleLeaderboardCount: eligibleReaders.length,
    skippedWithoutSprIdCount: leaderboard.length - eligibleReaders.length,
    notice,
    leaderboard: syncedLeaderboardEntries, // only included / synced students with SPR IDs!
  };
}
