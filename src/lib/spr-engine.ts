import { prisma } from './prisma';
import { MissingDataRule, CategorySummary, StudentSPRProfile, LeaderboardEntry } from '@/types';

// High-performance server-side in-memory cache with TTL for ultra-fast loading
const leaderboardCache = new Map<string, { timestamp: number; data: LeaderboardEntry[] }>();
const studentSPRProfileCache = new Map<string, { timestamp: number; data: StudentSPRProfile }>();
let cachedMissingDataRule: { timestamp: number; value: MissingDataRule } | null = null;
let cachedCategories: { timestamp: number; data: any[] } | null = null;

const CACHE_TTL_MS = 30 * 1000; // 30 seconds TTL

export function invalidateEngineCache() {
  leaderboardCache.clear();
  studentSPRProfileCache.clear();
  cachedMissingDataRule = null;
  cachedCategories = null;
}

export function normalizeScoreToPercentage(obtainedScore: number, maxScore: number): number {
  if (!maxScore || maxScore <= 0) return 0;
  const raw = (obtainedScore / maxScore) * 100;
  return Math.min(Math.max(Number(raw.toFixed(1)), 0), 100);
}

export function formatPercentage(val: number): string {
  return `${val.toFixed(1)}%`;
}

export async function getMissingDataRule(): Promise<MissingDataRule> {
  const now = Date.now();
  if (cachedMissingDataRule && now - cachedMissingDataRule.timestamp < CACHE_TTL_MS) {
    return cachedMissingDataRule.value;
  }
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'MISSING_DATA_RULE' },
  });
  const val = (setting?.value as MissingDataRule) || 'IGNORE_NORMALIZE';
  cachedMissingDataRule = { timestamp: now, value: val };
  return val;
}

export async function getCachedCategories() {
  const now = Date.now();
  if (cachedCategories && now - cachedCategories.timestamp < CACHE_TTL_MS) {
    return cachedCategories.data;
  }
  const categories = await prisma.category.findMany({
    where: { active: true },
    include: {
      categoryWeights: true,
    },
    orderBy: { displayOrder: 'asc' },
  });
  cachedCategories = { timestamp: now, data: categories };
  return categories;
}

export async function calculateStudentSPR(
  studentId: string,
  academicYearId?: string,
  termId?: string
): Promise<StudentSPRProfile | null> {
  const cacheKey = `${studentId}_${academicYearId || ''}_${termId || ''}`;
  const now = Date.now();
  const cached = studentSPRProfileCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const includeConfig = {
    class: true,
    school: true,
    academicYear: true,
    performanceRecords: {
      where: {
        ...(academicYearId ? { academicYearId } : {}),
        ...(termId ? { termId } : {}),
      },
      include: {
        category: true,
        subject: {
          include: { institution: true, board: true },
        },
        exam: {
          include: { term: true },
        },
        competition: {
          include: { program: true },
        },
        literaryCompetition: {
          include: { event: true },
        },
        level: true,
      },
    },
    creativeWorks: {
      include: {
        category: true,
      },
    },
    libraryRecords: true,
  };

  let student = await prisma.student.findUnique({
    where: { id: studentId },
    include: includeConfig,
  });

  if (!student) {
    student = await prisma.student.findUnique({
      where: { studentId },
      include: includeConfig,
    });
  }

  if (!student) {
    student = await prisma.student.findFirst({
      where: { sprStudentId: { equals: studentId, mode: 'insensitive' } },
      include: includeConfig,
    });
  }

  if (!student) return null;

  const categories = await getCachedCategories();
  const missingDataRule = await getMissingDataRule();

  const categorySummaries: CategorySummary[] = [];
  let weightedSum = 0;
  let activeWeightsTotal = 0;
  let missingCategoriesCount = 0;

  for (const cat of categories) {
    const activeWeightRecord = cat.categoryWeights?.find((w: any) => w.weight > 0) || cat.categoryWeights?.[0];
    const customWeight = activeWeightRecord?.weight;
    const isCatActive = activeWeightRecord?.isActive ?? cat.active;
    const isIncluded = activeWeightRecord?.isIncludedInSPR ?? cat.includeInSPR;
    const weight = (customWeight !== undefined && customWeight !== null && customWeight > 0) ? customWeight : (cat.defaultWeight > 0 ? cat.defaultWeight : 10.0);

    if (!isCatActive) continue;

    // Aggregate category records
    let categoryRecords = student.performanceRecords.filter((r) => r.categoryId === cat.id);
    let categoryPercentage = 0;
    let recordsCount = categoryRecords.length;
    let itemizedRecords: any[] = [];

    if (cat.code === 'CREATIVE_HUB' && student.creativeWorks.length > 0) {
      const creativePctSum = student.creativeWorks.reduce((acc, w) => acc + (w.percentage || 0), 0);
      categoryPercentage = Number((creativePctSum / student.creativeWorks.length).toFixed(1));
      recordsCount += student.creativeWorks.length;
      itemizedRecords = student.creativeWorks.map((w: any) => ({
        id: w.id,
        title: w.title,
        name: w.title,
        categoryName: cat.name,
        categoryCode: cat.code,
        subCategoryName: w.category?.name || 'Creative Submission',
        type: 'CREATIVE',
        publicationStatus: w.publicationStatus,
        rating: w.rating,
        percentage: w.percentage,
        obtainedScore: w.rating ?? w.percentage,
        maxScore: 100,
        mediaUrl: w.mediaUrl,
        date: w.date ? w.date.toISOString() : null,
        remarks: w.description || w.feedback,
      }));
    } else if (cat.code === 'LIBRARY' && student.libraryRecords.length > 0) {
      const readingScoreSum = student.libraryRecords.reduce((acc, r) => acc + (r.readingScore || 0), 0);
      categoryPercentage = Number((readingScoreSum / student.libraryRecords.length).toFixed(1));
      recordsCount += student.libraryRecords.length;
      itemizedRecords = student.libraryRecords.map((lib: any) => ({
        id: lib.id,
        name: lib.readingPeriod || 'Reading Milestone',
        title: lib.readingPeriod || 'Reading Milestone',
        categoryName: cat.name,
        categoryCode: cat.code,
        readingPeriod: lib.readingPeriod,
        booksRead: lib.booksRead,
        pagesRead: lib.pagesRead,
        type: 'LIBRARY',
        percentage: lib.readingScore,
        readingScore: lib.readingScore,
        obtainedScore: lib.booksRead,
        maxScore: 10,
        remarks: lib.remarks,
        date: lib.createdAt ? lib.createdAt.toISOString() : null,
      }));
    } else if (recordsCount > 0) {
      const totalPct = categoryRecords.reduce((acc, r) => acc + r.percentage, 0);
      categoryPercentage = Number((totalPct / recordsCount).toFixed(1));
      itemizedRecords = categoryRecords.map((r: any) => ({
        id: r.id,
        categoryId: r.categoryId,
        categoryCode: r.category.code,
        categoryName: r.category.name,
        name: r.subject?.name || r.competition?.name || r.literaryCompetition?.name || r.exam?.name || 'Assessment Record',
        subjectName: r.subject?.name,
        institutionName: r.subject?.institution?.name,
        boardName: r.subject?.board?.name,
        examName: r.exam?.name,
        termName: r.exam?.term?.name,
        competitionName: r.competition?.name,
        programName: r.competition?.program?.name,
        literaryCompetitionName: r.literaryCompetition?.name,
        eventName: r.literaryCompetition?.event?.name || r.competition?.program?.name,
        levelName: r.level?.name,
        obtainedScore: r.obtainedScore,
        maxScore: r.maxScore,
        percentage: r.percentage,
        remarks: r.remarks,
        date: r.date ? r.date.toISOString() : null,
      }));
    }

    const hasData = recordsCount > 0;
    if (!hasData) {
      missingCategoriesCount++;
    }

    categorySummaries.push({
      categoryId: cat.id,
      categoryCode: cat.code,
      categoryName: cat.name,
      icon: cat.icon,
      weight,
      percentage: categoryPercentage,
      recordsCount,
      isIncluded,
      records: itemizedRecords,
    });

    if (isIncluded) {
      if (hasData) {
        weightedSum += (categoryPercentage * weight) / 100;
        activeWeightsTotal += weight;
      } else if (missingDataRule === 'TREAT_AS_ZERO') {
        activeWeightsTotal += weight;
      }
    }
  }

  let overallSPR = 0;
  if (missingDataRule === 'IGNORE_NORMALIZE') {
    if (activeWeightsTotal > 0) {
      overallSPR = Number(((weightedSum / (activeWeightsTotal / 100))).toFixed(1));
    } else {
      overallSPR = 0;
    }
  } else {
    overallSPR = Number(weightedSum.toFixed(1));
  }

  const recentRecords = student.performanceRecords
    .slice(0, 20)
    .map((r) => ({
      id: r.id,
      categoryName: r.category.name,
      categoryCode: r.category.code,
      eventName: r.subject?.name || r.competition?.name || r.literaryCompetition?.name || r.exam?.name || 'Assessment',
      subjectName: r.subject?.name,
      examName: r.exam?.name,
      competitionName: r.competition?.name,
      literaryCompetitionName: r.literaryCompetition?.name,
      institutionName: r.subject?.institution?.name,
      obtainedScore: r.obtainedScore,
      maxScore: r.maxScore,
      percentage: r.percentage,
      date: r.date.toISOString(),
      levelName: r.level?.name,
      remarks: r.remarks,
    }));

  // Group detailed records for calculation breakdowns
  const subjectWiseRecords = student.performanceRecords
    .filter((r) => r.category.code === 'ISLAMIC' || r.category.code === 'SCHOOL' || r.subjectId)
    .map((r) => ({
      id: r.id,
      categoryName: r.category.name,
      categoryCode: r.category.code,
      subjectName: r.subject?.name || 'Academic Subject',
      examName: r.exam?.name || 'Assessment',
      termName: r.exam?.term?.name || 'Annual',
      institutionName: r.subject?.institution?.name,
      obtainedScore: r.obtainedScore,
      maxScore: r.maxScore,
      percentage: r.percentage,
    }));

  const programmeWiseRecords = student.performanceRecords
    .filter((r) => r.category.code === 'PROGRAMS' || r.category.code === 'LITERARY' || r.competitionId || r.literaryCompetitionId)
    .map((r) => ({
      id: r.id,
      categoryName: r.category.name,
      categoryCode: r.category.code,
      festName: r.literaryCompetition?.event?.name || r.competition?.program?.name || 'Festival / Program',
      competitionName: r.literaryCompetition?.name || r.competition?.name || 'Competition Event',
      levelName: r.level?.name || 'Campus',
      obtainedScore: r.obtainedScore,
      maxScore: r.maxScore,
      percentage: r.percentage,
      remarks: r.remarks,
    }));

  const profileResult = {
    student: {
      id: student.id,
      studentId: student.studentId,
      sprStudentId: student.sprStudentId,
      fullName: student.fullName,
      division: student.division,
      status: student.status,
      photoUrl: student.photoUrl,
      notes: student.notes,
      class: student.class,
      school: student.school,
      academicYear: student.academicYear,
    },
    overallSPR,
    rank: 1,
    classRank: 1,
    schoolRank: 1,
    totalStudentsInClass: 0,
    totalStudentsInSchool: 0,
    totalStudentsOverall: 0,
    categoryScores: categorySummaries,
    missingCategoriesCount,
    recentRecords,
    subjectWiseRecords,
    programmeWiseRecords,
    allRecords: student.performanceRecords.map((r) => ({
      id: r.id,
      categoryCode: r.category.code,
      categoryName: r.category.name,
      name: r.subject?.name || r.competition?.name || r.literaryCompetition?.name || r.exam?.name || 'Record',
      obtainedScore: r.obtainedScore,
      maxScore: r.maxScore,
      percentage: r.percentage,
      remarks: r.remarks,
    })),
  } as any;

  studentSPRProfileCache.set(cacheKey, { timestamp: now, data: profileResult });
  return profileResult;
}

export async function calculateAllLeaderboards(filters?: {
  academicYearId?: string;
  classId?: string;
  schoolId?: string;
  categoryId?: string;
  subcategoryId?: string;
  stream?: string; // e.g. 'JAMIATHUL_HIND', 'MADIN_ACADEMY'
  fest?: string; // e.g. 'SAHITYOTSAV', 'KALOTSAV', 'M_LIT', 'JAMIA_MAHRAJAN'
}): Promise<LeaderboardEntry[]> {
  const cacheKey = JSON.stringify(filters || {});
  const now = Date.now();
  const cached = leaderboardCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const whereClause: any = { status: 'ACTIVE' };
  if (filters?.academicYearId) whereClause.academicYearId = filters.academicYearId;
  if (filters?.classId) whereClause.classId = filters.classId;
  if (filters?.schoolId) whereClause.schoolId = filters.schoolId;

  const isFestOrStream = !!(filters?.fest || filters?.stream);

  const students = await prisma.student.findMany({
    where: whereClause,
    include: {
      class: true,
      school: true,
      academicYear: true,
      performanceRecords: {
        include: isFestOrStream
          ? {
              category: true,
              subject: {
                include: { institution: true, board: true },
              },
              competition: {
                include: { program: true },
              },
              literaryCompetition: {
                include: { event: true },
              },
              subcategory: true,
            }
          : {
              category: true,
              subcategory: true,
            },
      },
      creativeWorks: true,
      libraryRecords: true,
    },
  });

  const categories = await getCachedCategories();
  const missingDataRule = await getMissingDataRule();
  const entries: LeaderboardEntry[] = [];

  for (const student of students) {
    const categoryPercentages: Record<string, number> = {};
    let weightedSum = 0;
    let activeWeightsTotal = 0;
    let totalRecords = student.performanceRecords.length + student.creativeWorks.length + student.libraryRecords.length;

    // Subcategory-specific calculation if requested
    let subcategoryScore = 0;
    let subcategoryRecordsCount = 0;
    if (filters?.subcategoryId) {
      const subRecords = (student.performanceRecords as any[]).filter(
        (r) => r.subcategoryId === filters.subcategoryId
      );
      if (subRecords.length > 0) {
        const sum = subRecords.reduce((acc, r) => acc + (r.percentage || 0), 0);
        subcategoryScore = Number((sum / subRecords.length).toFixed(1));
        subcategoryRecordsCount = subRecords.length;
      }
    }

    // Stream-specific Islamic calculation if requested
    let streamIslamicScore = 0;
    let streamIslamicRecordsCount = 0;

    if (filters?.stream) {
      const streamTarget = filters.stream.toUpperCase();
      const streamRecords = (student.performanceRecords as any[]).filter((r) => {
        const instCode = r.subject?.institution?.code?.toUpperCase() || '';
        const instName = r.subject?.institution?.name?.toUpperCase() || '';
        if (streamTarget === 'JAMIATHUL_HIND') {
          return instCode.includes('JAMIATHUL') || instName.includes('JAMIATHUL');
        }
        if (streamTarget === 'MADIN_ACADEMY') {
          return instCode.includes('MADIN') || instName.includes('MADIN');
        }
        return false;
      });

      if (streamRecords.length > 0) {
        const sum = streamRecords.reduce((acc, r) => acc + r.percentage, 0);
        streamIslamicScore = Number((sum / streamRecords.length).toFixed(1));
        streamIslamicRecordsCount = streamRecords.length;
      }
    }

    // Fest-specific Literary calculation if requested
    let festScore = 0;
    let festRecordsCount = 0;

    if (filters?.fest) {
      const festTarget = filters.fest.toUpperCase();
      const festRecords = (student.performanceRecords as any[]).filter((r) => {
        const eventName = (r.literaryCompetition?.event?.name || r.competition?.program?.name || '').toUpperCase();
        const compName = (r.literaryCompetition?.name || r.competition?.name || '').toUpperCase();
        const remarks = (r.remarks || '').toUpperCase();

        if (festTarget.includes('SAHITYOTSAV') || festTarget.includes('SAHITHYOTSAV')) {
          return eventName.includes('SAHITYOTSAV') || compName.includes('SAHITYOTSAV') || remarks.includes('SAHITYOTSAV');
        }
        if (festTarget.includes('KALOTSAV')) {
          return eventName.includes('KALOTSAV') || compName.includes('KALOTSAV') || remarks.includes('KALOTSAV') || compName.includes('KERALA SCHOOL');
        }
        if (festTarget.includes('M_LIT') || festTarget.includes('M-LIT') || festTarget.includes('MLIT')) {
          return eventName.includes('M-LIT') || compName.includes('M-LIT') || remarks.includes('M-LIT') || eventName.includes('MLIT');
        }
        if (festTarget.includes('MAHRAJAN') || festTarget.includes('JAMIA')) {
          return eventName.includes('MAHRAJAN') || compName.includes('MAHRAJAN') || remarks.includes('MAHRAJAN') || eventName.includes('MAHARJAN');
        }
        return false;
      });

      if (festRecords.length > 0) {
        const sum = festRecords.reduce((acc, r) => acc + r.percentage, 0);
        festScore = Number((sum / festRecords.length).toFixed(1));
        festRecordsCount = festRecords.length;
      } else {
        // If student doesn't have exact fest records yet, check literary category score as fallback
        const litRecords = student.performanceRecords.filter((r) => r.category?.code === 'LITERARY');
        if (litRecords.length > 0) {
          const sum = litRecords.reduce((acc, r) => acc + r.percentage, 0);
          festScore = Number((sum / litRecords.length).toFixed(1));
          festRecordsCount = litRecords.length;
        }
      }
    }

    for (const cat of categories) {
      const activeWeightRecord = cat.categoryWeights?.find((w: any) => w.weight > 0) || cat.categoryWeights?.[0];
      const customWeight = activeWeightRecord?.weight;
      const isCatActive = activeWeightRecord?.isActive ?? cat.active;
      const isIncluded = activeWeightRecord?.isIncludedInSPR ?? cat.includeInSPR;
      const weight = (customWeight !== undefined && customWeight !== null && customWeight > 0) ? customWeight : (cat.defaultWeight > 0 ? cat.defaultWeight : 10.0);

      if (!isCatActive) continue;

      let categoryRecords = student.performanceRecords.filter((r) => r.categoryId === cat.id);
      let catPct = 0;
      let hasData = false;

      if (cat.code === 'CREATIVE_HUB' && student.creativeWorks.length > 0) {
        const sum = student.creativeWorks.reduce((acc, w) => acc + (w.percentage || 0), 0);
        catPct = Number((sum / student.creativeWorks.length).toFixed(1));
        hasData = true;
      } else if (cat.code === 'LIBRARY' && student.libraryRecords.length > 0) {
        const sum = student.libraryRecords.reduce((acc, r) => acc + (r.readingScore || 0), 0);
        catPct = Number((sum / student.libraryRecords.length).toFixed(1));
        hasData = true;
      } else if (categoryRecords.length > 0) {
        const sum = categoryRecords.reduce((acc, r) => acc + r.percentage, 0);
        catPct = Number((sum / categoryRecords.length).toFixed(1));
        hasData = true;
      }

      categoryPercentages[cat.id] = catPct;

      if (isIncluded) {
        if (hasData) {
          weightedSum += (catPct * weight) / 100;
          activeWeightsTotal += weight;
        } else if (missingDataRule === 'TREAT_AS_ZERO') {
          activeWeightsTotal += weight;
        }
      }
    }

    let finalScore = 0;
    if (filters?.subcategoryId) {
      finalScore = subcategoryScore;
      totalRecords = subcategoryRecordsCount;
    } else if (filters?.fest) {
      finalScore = festScore;
      totalRecords = festRecordsCount;
    } else if (filters?.stream) {
      finalScore = streamIslamicScore;
      totalRecords = streamIslamicRecordsCount;
    } else if (filters?.categoryId) {
      finalScore = categoryPercentages[filters.categoryId] || 0;
    } else {
      if (missingDataRule === 'IGNORE_NORMALIZE') {
        finalScore = activeWeightsTotal > 0 ? Number((weightedSum / (activeWeightsTotal / 100)).toFixed(1)) : 0;
      } else {
        finalScore = Number(weightedSum.toFixed(1));
      }
    }

    entries.push({
      rank: 0,
      studentId: student.id,
      studentCode: student.studentId,
      studentIdCode: student.studentId,
      sprStudentId: student.sprStudentId,
      name: student.fullName,
      studentName: student.fullName,
      className: student.class.name,
      schoolName: student.school.name,
      spr: finalScore,
      overallScore: finalScore,
      photoUrl: student.photoUrl,
      division: student.division,
      categoryPercentages,
      recordsCount: totalRecords,
    });
  }

  // Determine if this is an overall institutional leaderboard or a specific category/fest/stream/subcategory leaderboard
  const isOverall = !filters?.categoryId && !filters?.subcategoryId && !filters?.fest && !filters?.stream;

  // In all leaderboards except Overall, exclude 0% students from ranking
  let rankedEntries = isOverall ? entries : entries.filter((e) => (e.spr || 0) > 0);

  // Sort descending by score, then secondary tie-breaker by total recordsCount, then alphabetically by name
  rankedEntries.sort((a, b) => {
    if (b.spr !== a.spr) return b.spr - a.spr;
    if ((b.recordsCount || 0) !== (a.recordsCount || 0)) {
      return (b.recordsCount || 0) - (a.recordsCount || 0);
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  // Assign sequential clean ranks (1, 2, 3, 4, 5, 6, 7, 8, 9, 10...) based on deterministic tie-breaking
  for (let i = 0; i < rankedEntries.length; i++) {
    rankedEntries[i].rank = i + 1;
  }

  // Mark tie flags and count of tied peers
  const scoreCounts: Record<number, number> = {};
  rankedEntries.forEach((e) => {
    scoreCounts[e.spr] = (scoreCounts[e.spr] || 0) + 1;
  });
  rankedEntries.forEach((e: any) => {
    e.isTied = scoreCounts[e.spr] > 1;
    e.tiedCount = scoreCounts[e.spr];
  });

  leaderboardCache.set(cacheKey, { timestamp: now, data: rankedEntries });
  return rankedEntries;
}

