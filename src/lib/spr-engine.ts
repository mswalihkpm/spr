import { prisma } from './prisma';
import { MissingDataRule, CategorySummary, StudentSPRProfile, LeaderboardEntry } from '@/types';

// High-performance server-side in-memory cache with TTL for ultra-fast loading
const leaderboardCache = new Map<string, { timestamp: number; data: LeaderboardEntry[] }>();
const studentSPRProfileCache = new Map<string, { timestamp: number; data: StudentSPRProfile }>();
let cachedMissingDataRule: { timestamp: number; value: MissingDataRule } | null = null;
let cachedCategories: { timestamp: number; data: any[] } | null = null;
let cachedSettings: { timestamp: number; data: Record<string, string> } | null = null;
let cachedLevels: { timestamp: number; data: any[] } | null = null;

const CACHE_TTL_MS = 30 * 1000; // 30 seconds TTL

export function invalidateEngineCache() {
  leaderboardCache.clear();
  studentSPRProfileCache.clear();
  cachedMissingDataRule = null;
  cachedCategories = null;
  cachedSettings = null;
  cachedLevels = null;
}

export function normalizeScoreToPercentage(obtainedScore: number, maxScore: number): number {
  if (!maxScore || maxScore <= 0) return 0;
  const raw = (obtainedScore / maxScore) * 100;
  return Math.min(Math.max(Number(raw.toFixed(2)), 0), 100);
}

export function formatPercentage(val: number): string {
  return `${val.toFixed(2)}%`;
}

export async function getCachedSettings(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedSettings && now - cachedSettings.timestamp < CACHE_TTL_MS) {
    return cachedSettings.data;
  }
  const settingsList = await prisma.systemSetting.findMany();
  const map: Record<string, string> = {
    MISSING_DATA_RULE: 'IGNORE_NORMALIZE',
    PRIZE_SCORE_1ST: '100',
    PRIZE_SCORE_2ND: '75',
    PRIZE_SCORE_3RD: '50',
    LIBRARY_NORMALIZATION_REF: '500',
    ACHIEVEMENT_NORMALIZATION_REF: '500',
  };
  settingsList.forEach((s) => {
    map[s.key] = s.value;
  });
  cachedSettings = { timestamp: now, data: map };
  return map;
}

export async function getMissingDataRule(): Promise<MissingDataRule> {
  const settings = await getCachedSettings();
  return (settings.MISSING_DATA_RULE as MissingDataRule) || 'IGNORE_NORMALIZE';
}

export async function getCachedLevels() {
  const now = Date.now();
  if (cachedLevels && now - cachedLevels.timestamp < CACHE_TTL_MS) {
    return cachedLevels.data;
  }
  const levels = await prisma.level.findMany({
    where: { active: true },
    orderBy: { displayOrder: 'asc' },
  });
  cachedLevels = { timestamp: now, data: levels };
  return levels;
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
      subcategories: {
        where: { active: true },
        orderBy: { displayOrder: 'asc' },
      },
    },
    orderBy: { displayOrder: 'asc' },
  });
  cachedCategories = { timestamp: now, data: categories };
  return categories;
}

// Helper to resolve level multiplier safely
export function resolveLevelMultiplier(level: any, levelsList: any[]): number {
  if (!level) return 1.0;
  if (typeof level.weightMultiplier === 'number' && level.weightMultiplier > 0) {
    return level.weightMultiplier;
  }
  const levelCode = (level.code || level.name || '').toUpperCase();
  const matched = levelsList.find(
    (l) => l.code?.toUpperCase() === levelCode || l.name?.toUpperCase() === levelCode || l.id === level.id
  );
  if (matched && typeof matched.weightMultiplier === 'number') {
    return matched.weightMultiplier;
  }

  // Fallback defaults
  if (levelCode.includes('INTER')) return 5.0;
  if (levelCode.includes('NATION')) return 4.5;
  if (levelCode.includes('STATE') || levelCode.includes('JAMIA')) return 4.0;
  if (levelCode.includes('DAAERA') || levelCode.includes('DAEERA')) return 3.0;
  if (levelCode.includes('DISTRICT')) return 2.5;
  if (levelCode.includes('DIVISION') || levelCode.includes('SUB_DISTRICT') || levelCode.includes('KULLIYA')) return 2.0;
  return 1.0;
}

// Helper to resolve prize base score
export function resolvePrizeBaseScore(position: string | null | undefined, settings: Record<string, string>): number {
  const pos = (position || '').trim().toLowerCase();
  const prize1st = parseFloat(settings.PRIZE_SCORE_1ST || '100') || 100;
  const prize2nd = parseFloat(settings.PRIZE_SCORE_2ND || '75') || 75;
  const prize3rd = parseFloat(settings.PRIZE_SCORE_3RD || '50') || 50;

  if (pos.startsWith('1') || pos.includes('first')) return prize1st;
  if (pos.startsWith('2') || pos.includes('second')) return prize2nd;
  if (pos.startsWith('3') || pos.includes('third')) return prize3rd;
  return 0;
}

export const DEFAULT_CATEGORY_WEIGHTS: Record<string, number> = {
  ISLAMIC: 20.0,
  SCHOOL: 80 / 6, // 13.333333333333334
  QUALIFICATION: 80 / 6,
  CREATIVE_HUB: 80 / 6,
  LIBRARY: 80 / 6,
  LITERARY: 80 / 6,
  PROGRAMS: 80 / 6,
};

export function resolveCategoryWeight(cat: any): number {
  const activeWeightRecord = cat.categoryWeights?.find((w: any) => w.weight > 0) || cat.categoryWeights?.[0];
  const customWeight = activeWeightRecord?.weight ?? cat.defaultWeight;
  if (customWeight !== undefined && customWeight !== null && customWeight > 0) {
    if (Math.abs(customWeight - 13.33) < 0.05 || Math.abs(customWeight - 13.3333) < 0.01) {
      return 80 / 6;
    }
    if (cat.code === 'ISLAMIC' && (customWeight === 40 || customWeight === 20)) {
      return 20.0;
    }
    if (cat.code !== 'ISLAMIC' && (customWeight === 35 || customWeight === 45 || customWeight === 10 || customWeight === 12 || customWeight === 8 || customWeight === 5)) {
      return 80 / 6;
    }
    return customWeight;
  }
  if (cat.code === 'ISLAMIC') return 20.0;
  return 80 / 6;
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
        subcategory: true,
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

  const [categories, settings, levelsList] = await Promise.all([
    getCachedCategories(),
    getCachedSettings(),
    getCachedLevels(),
  ]);

  const missingDataRule = (settings.MISSING_DATA_RULE as MissingDataRule) || 'IGNORE_NORMALIZE';
  const libraryRefPoints = parseFloat(settings.LIBRARY_NORMALIZATION_REF || '500') || 500;
  const achievementRefPoints = parseFloat(settings.ACHIEVEMENT_NORMALIZATION_REF || '500') || 500;

  // Compute Total Active Configured Weight Denominator
  let totalActiveConfiguredWeight = 0;
  let activeIncludedWeightsSumWithData = 0;

  const parsedCategories = categories.map((cat) => {
    const activeWeightRecord = cat.categoryWeights?.find((w: any) => w.weight > 0) || cat.categoryWeights?.[0];
    const isCatActive = activeWeightRecord?.isActive ?? cat.active;
    const isIncluded = activeWeightRecord?.isIncludedInSPR ?? cat.includeInSPR;
    const weight = resolveCategoryWeight(cat);

    if (isCatActive && isIncluded) {
      totalActiveConfiguredWeight += weight;
    }

    return {
      cat,
      weight,
      isCatActive,
      isIncluded,
    };
  });

  const categorySummaries: CategorySummary[] = [];
  let missingCategoriesCount = 0;

  for (const { cat, weight, isCatActive, isIncluded } of parsedCategories) {
    if (!isCatActive) continue;

    let categoryRecords = student.performanceRecords.filter((r) => r.categoryId === cat.id);
    let normalizedPercentage = 0;
    let earnedPoints = 0;
    let rawInput = '—';
    let formula = '';
    let normalizationRef: number | undefined = undefined;
    let recordsCount = categoryRecords.length;
    let itemizedRecords: any[] = [];
    let hasData = false;

    // 1. ISLAMIC STUDIES
    if (cat.code === 'ISLAMIC') {
      if (categoryRecords.length > 0) {
        hasData = true;
        const totalPct = categoryRecords.reduce((acc, r) => acc + (r.percentage || 0), 0);
        normalizedPercentage = Math.min(Math.max(Number((totalPct / categoryRecords.length).toFixed(2)), 0), 100);
        rawInput = `${normalizedPercentage.toFixed(2)}%`;
        formula = `Average of ${categoryRecords.length} Islamic Studies Assessment(s) = ${normalizedPercentage.toFixed(2)}%`;
        itemizedRecords = categoryRecords.map((r: any) => ({
          id: r.id,
          categoryId: r.categoryId,
          categoryCode: 'ISLAMIC',
          categoryName: cat.name,
          name: r.subject?.name || r.exam?.name || 'Islamic Studies Assessment',
          subjectName: r.subject?.name,
          institutionName: r.subject?.institution?.name,
          examName: r.exam?.name,
          termName: r.exam?.term?.name,
          obtainedScore: r.obtainedScore,
          maxScore: r.maxScore,
          percentage: r.percentage,
          remarks: r.remarks,
          date: r.date ? r.date.toISOString() : null,
        }));
      } else {
        formula = `No Islamic Studies assessments logged (0.00%)`;
      }
    }

    // 2. SCHOOL STUDIES
    else if (cat.code === 'SCHOOL') {
      if (categoryRecords.length > 0) {
        hasData = true;
        const totalPct = categoryRecords.reduce((acc, r) => acc + (r.percentage || 0), 0);
        normalizedPercentage = Math.min(Math.max(Number((totalPct / categoryRecords.length).toFixed(2)), 0), 100);
        rawInput = `${normalizedPercentage.toFixed(2)}%`;
        formula = `Average of ${categoryRecords.length} School Subject Mark(s) = ${normalizedPercentage.toFixed(2)}%`;
        itemizedRecords = categoryRecords.map((r: any) => ({
          id: r.id,
          categoryId: r.categoryId,
          categoryCode: 'SCHOOL',
          categoryName: cat.name,
          name: r.subject?.name || r.exam?.name || 'School Academic Mark',
          subjectName: r.subject?.name,
          boardName: r.subject?.board?.name,
          examName: r.exam?.name,
          termName: r.exam?.term?.name,
          obtainedScore: r.obtainedScore,
          maxScore: r.maxScore,
          percentage: r.percentage,
          remarks: r.remarks,
          date: r.date ? r.date.toISOString() : null,
        }));
      } else {
        formula = `No School academic marks logged (0.00%)`;
      }
    }

    // 3. QUALIFICATION
    else if (cat.code === 'QUALIFICATION') {
      if (categoryRecords.length > 0) {
        hasData = true;
        const totalPct = categoryRecords.reduce((acc, r) => acc + (r.percentage || 0), 0);
        normalizedPercentage = Math.min(Math.max(Number((totalPct / categoryRecords.length).toFixed(2)), 0), 100);
        rawInput = `${normalizedPercentage.toFixed(2)}%`;
        formula = `Average of ${categoryRecords.length} Qualification Assessment(s) = ${normalizedPercentage.toFixed(2)}%`;
        itemizedRecords = categoryRecords.map((r: any) => ({
          id: r.id,
          categoryId: r.categoryId,
          categoryCode: 'QUALIFICATION',
          categoryName: cat.name,
          name: r.subcategory?.name || r.subject?.name || 'Qualification Milestone',
          subCategoryName: r.subcategory?.name || 'General Assessment',
          levelName: r.level?.name,
          obtainedScore: r.obtainedScore,
          maxScore: r.maxScore,
          percentage: r.percentage,
          position: r.position,
          grade: r.grade,
          remarks: r.remarks,
          date: r.date ? r.date.toISOString() : null,
        }));
      } else {
        formula = `No Qualification records logged (0.00%)`;
      }
    }

    // 4. CREATIVE HUB
    else if (cat.code === 'CREATIVE_HUB') {
      const works = student.creativeWorks || [];
      if (works.length > 0) {
        hasData = true;
        recordsCount = works.length;
        const totalPct = works.reduce((acc, w) => acc + (w.percentage || 0), 0);
        normalizedPercentage = Math.min(Math.max(Number((totalPct / works.length).toFixed(2)), 0), 100);
        rawInput = `${works.length} submission(s)`;
        formula = `Average of ${works.length} Creative Work(s) = ${normalizedPercentage.toFixed(2)}%`;
        itemizedRecords = works.map((w: any) => ({
          id: w.id,
          title: w.title,
          name: w.title,
          categoryName: cat.name,
          categoryCode: 'CREATIVE_HUB',
          subCategoryName: w.category?.name || 'Creative Submission',
          type: 'CREATIVE',
          publicationStatus: w.publicationStatus,
          rating: w.rating,
          percentage: w.percentage,
          obtainedScore: w.score ?? w.percentage,
          maxScore: w.maxScore || 100,
          mediaUrl: w.mediaUrl,
          date: w.date ? w.date.toISOString() : null,
          remarks: w.remarks || w.description,
        }));
      } else {
        formula = `No Creative Hub submissions logged (0.00%)`;
      }
    }

    // 5. LIBRARY & READING
    else if (cat.code === 'LIBRARY') {
      const libRecords = student.libraryRecords || [];
      normalizationRef = libraryRefPoints;
      if (libRecords.length > 0) {
        hasData = true;
        recordsCount = libRecords.length;
        earnedPoints = libRecords.reduce((acc, r) => acc + (r.readingScore || 0), 0);
        normalizedPercentage = Math.min(Math.max(Number(((earnedPoints / libraryRefPoints) * 100).toFixed(2)), 0), 100);
        rawInput = `${earnedPoints} pts`;
        formula = `MIN(${earnedPoints} / ${libraryRefPoints} × 100, 100) = ${normalizedPercentage.toFixed(2)}%`;
        itemizedRecords = libRecords.map((lib: any) => ({
          id: lib.id,
          name: lib.readingPeriod || 'Reading Milestone',
          title: lib.readingPeriod || 'Reading Milestone',
          categoryName: cat.name,
          categoryCode: 'LIBRARY',
          readingPeriod: lib.readingPeriod,
          booksRead: lib.booksRead,
          pagesRead: lib.pagesRead,
          type: 'LIBRARY',
          earnedPoints: lib.readingScore,
          obtainedScore: lib.readingScore,
          percentage: Math.min(Math.max(Number(((lib.readingScore / libraryRefPoints) * 100).toFixed(2)), 0), 100),
          readingScore: lib.readingScore,
          maxScore: libraryRefPoints,
          remarks: lib.remarks,
          date: lib.createdAt ? lib.createdAt.toISOString() : null,
        }));
      } else {
        formula = `MIN(0 / ${libraryRefPoints} × 100, 100) = 0.00%`;
      }
    }

    // 6. LITERARY PROGRAMMES
    else if (cat.code === 'LITERARY') {
      normalizationRef = achievementRefPoints;
      if (categoryRecords.length > 0) {
        hasData = true;
        let totalAchievementPoints = 0;
        itemizedRecords = categoryRecords.map((r: any) => {
          const mult = resolveLevelMultiplier(r.level, levelsList);
          const prizeBase = resolvePrizeBaseScore(r.position, settings);
          const baseScore = prizeBase > 0 ? prizeBase : (r.obtainedScore || 0);
          const eventPoints = Number((baseScore * mult).toFixed(2));
          totalAchievementPoints += eventPoints;

          return {
            id: r.id,
            categoryId: r.categoryId,
            categoryCode: 'LITERARY',
            categoryName: cat.name,
            name: r.literaryCompetition?.name || r.competition?.name || 'Literary Event',
            eventName: r.literaryCompetition?.event?.name || 'Literary Festival',
            levelName: r.level?.name || 'Campus',
            levelMultiplier: mult,
            position: r.position,
            prizeBaseScore: baseScore,
            achievementPoints: eventPoints,
            obtainedScore: eventPoints,
            maxScore: achievementRefPoints,
            percentage: normalizeScoreToPercentage(eventPoints, achievementRefPoints),
            remarks: r.remarks,
            date: r.date ? r.date.toISOString() : null,
          };
        });

        earnedPoints = Number(totalAchievementPoints.toFixed(2));
        normalizedPercentage = Math.min(
          Math.max(Number(((earnedPoints / achievementRefPoints) * 100).toFixed(2)), 0),
          100
        );
        rawInput = `${earnedPoints} pts`;
        formula = `MIN(${earnedPoints} / ${achievementRefPoints} × 100, 100) = ${normalizedPercentage.toFixed(2)}%`;
      } else {
        formula = `MIN(0 / ${achievementRefPoints} × 100, 100) = 0.00%`;
      }
    }

    // 7. PROGRAMMES & COMPETITIONS
    else if (cat.code === 'PROGRAMS') {
      normalizationRef = achievementRefPoints;
      if (categoryRecords.length > 0) {
        hasData = true;
        let totalAchievementPoints = 0;
        itemizedRecords = categoryRecords.map((r: any) => {
          const mult = resolveLevelMultiplier(r.level, levelsList);
          const prizeBase = resolvePrizeBaseScore(r.position, settings);
          const baseScore = prizeBase > 0 ? prizeBase : (r.obtainedScore || 0);
          const eventPoints = Number((baseScore * mult).toFixed(2));
          totalAchievementPoints += eventPoints;

          return {
            id: r.id,
            categoryId: r.categoryId,
            categoryCode: 'PROGRAMS',
            categoryName: cat.name,
            name: r.competition?.name || r.literaryCompetition?.name || 'Competition Event',
            eventName: r.competition?.program?.name || 'Program',
            levelName: r.level?.name || 'Campus',
            levelMultiplier: mult,
            position: r.position,
            prizeBaseScore: baseScore,
            achievementPoints: eventPoints,
            obtainedScore: eventPoints,
            maxScore: achievementRefPoints,
            percentage: normalizeScoreToPercentage(eventPoints, achievementRefPoints),
            remarks: r.remarks,
            date: r.date ? r.date.toISOString() : null,
          };
        });

        earnedPoints = Number(totalAchievementPoints.toFixed(2));
        normalizedPercentage = Math.min(
          Math.max(Number(((earnedPoints / achievementRefPoints) * 100).toFixed(2)), 0),
          100
        );
        rawInput = `${earnedPoints} pts`;
        formula = `MIN(${earnedPoints} / ${achievementRefPoints} × 100, 100) = ${normalizedPercentage.toFixed(2)}%`;
      } else {
        formula = `MIN(0 / ${achievementRefPoints} × 100, 100) = 0.00%`;
      }
    }

    // CUSTOM / OTHER EXTENSION CATEGORIES
    else {
      if (categoryRecords.length > 0) {
        hasData = true;
        const totalPct = categoryRecords.reduce((acc, r) => acc + (r.percentage || 0), 0);
        normalizedPercentage = Math.min(Math.max(Number((totalPct / categoryRecords.length).toFixed(2)), 0), 100);
        rawInput = `${normalizedPercentage.toFixed(2)}%`;
        formula = `Average Assessment = ${normalizedPercentage.toFixed(2)}%`;
        itemizedRecords = categoryRecords.map((r: any) => ({
          id: r.id,
          categoryId: r.categoryId,
          categoryCode: cat.code,
          categoryName: cat.name,
          name: r.subcategory?.name || r.subject?.name || 'Assessment',
          obtainedScore: r.obtainedScore,
          maxScore: r.maxScore,
          percentage: r.percentage,
          date: r.date ? r.date.toISOString() : null,
        }));
      } else {
        formula = `No records logged (0.00%)`;
      }
    }

    if (!hasData) {
      missingCategoriesCount++;
    }

    if (isIncluded && hasData) {
      activeIncludedWeightsSumWithData += weight;
    }

    categorySummaries.push({
      categoryId: cat.id,
      categoryCode: cat.code,
      categoryName: cat.name,
      icon: cat.icon,
      priority: cat.displayOrder || 1,
      weight,
      score: normalizedPercentage,
      percentage: normalizedPercentage,
      normalizedPercentage,
      rawInput,
      earnedPoints,
      normalizationRef,
      weightedContribution: 0, // Computed below after weight total is final
      formula,
      recordsCount,
      isIncluded,
      records: itemizedRecords,
    });
  }

  // Calculate Weighted Contributions and Final SPR Score
  // Formula: Weighted Contribution = (Normalized Category Percentage / 100) * Category Weight
  // Final SPR = SUM(all 7 weighted contributions)
  let finalSPRSum = 0;
  for (const cs of categorySummaries) {
    if (cs.isIncluded) {
      const contrib = (cs.normalizedPercentage! * cs.weight) / 100;
      cs.weightedContribution = Number(contrib.toFixed(2));
      finalSPRSum += contrib;
    } else {
      cs.weightedContribution = 0;
    }
  }

  // Final SPR Score clamped to 0.00% – 100.00%
  const finalSPR = Math.min(Math.max(Number(finalSPRSum.toFixed(2)), 0), 100);

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

  const profileResult: StudentSPRProfile = {
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
    overallSPR: finalSPR,
    overallScore: finalSPR,
    rawWeightedTotal: Number(finalSPR.toFixed(2)),
    maxWeightedTotal: 100,
    normalizedScore: `${finalSPR.toFixed(2)} / 100`,
    rank: 1,
    classRank: 1,
    schoolRank: 1,
    totalStudentsInClass: 0,
    totalStudentsInSchool: 0,
    totalStudentsOverall: 0,
    categoryScores: categorySummaries,
    categoryBreakdown: categorySummaries,
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
  };

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
              level: true,
            }
          : {
              category: true,
              subcategory: true,
              level: true,
            },
      },
      creativeWorks: true,
      libraryRecords: true,
    },
  });

  const [categories, settings, levelsList] = await Promise.all([
    getCachedCategories(),
    getCachedSettings(),
    getCachedLevels(),
  ]);

  const missingDataRule = (settings.MISSING_DATA_RULE as MissingDataRule) || 'IGNORE_NORMALIZE';
  const libraryRefPoints = parseFloat(settings.LIBRARY_NORMALIZATION_REF || '500') || 500;
  const achievementRefPoints = parseFloat(settings.ACHIEVEMENT_NORMALIZATION_REF || '500') || 500;

  let totalActiveConfiguredWeight = 0;
  const parsedCategories = categories.map((cat) => {
    const activeWeightRecord = cat.categoryWeights?.find((w: any) => w.weight > 0) || cat.categoryWeights?.[0];
    const isCatActive = activeWeightRecord?.isActive ?? cat.active;
    const isIncluded = activeWeightRecord?.isIncludedInSPR ?? cat.includeInSPR;
    const weight = resolveCategoryWeight(cat);

    if (isCatActive && isIncluded) {
      totalActiveConfiguredWeight += weight;
    }

    return {
      cat,
      weight,
      isCatActive,
      isIncluded,
    };
  });

  const entries: LeaderboardEntry[] = [];

  for (const student of students) {
    const categoryPercentages: Record<string, number> = {};
    let weightedSum = 0;
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
        subcategoryScore = Number((sum / subRecords.length).toFixed(2));
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
        const sum = streamRecords.reduce((acc, r) => acc + (r.percentage || 0), 0);
        streamIslamicScore = Number((sum / streamRecords.length).toFixed(2));
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
        const sum = festRecords.reduce((acc, r) => acc + (r.percentage || 0), 0);
        festScore = Number((sum / festRecords.length).toFixed(2));
        festRecordsCount = festRecords.length;
      } else {
        const litRecords = student.performanceRecords.filter((r) => r.category?.code === 'LITERARY');
        if (litRecords.length > 0) {
          const sum = litRecords.reduce((acc, r) => acc + (r.percentage || 0), 0);
          festScore = Number((sum / litRecords.length).toFixed(2));
          festRecordsCount = litRecords.length;
        }
      }
    }

    for (const { cat, weight, isCatActive, isIncluded } of parsedCategories) {
      if (!isCatActive) continue;

      let catPct = 0;
      let hasData = false;

      if (cat.code === 'CREATIVE_HUB') {
        if (student.creativeWorks.length > 0) {
          const sum = student.creativeWorks.reduce((acc, w) => acc + (w.percentage || 0), 0);
          catPct = Math.min(Math.max(Number((sum / student.creativeWorks.length).toFixed(2)), 0), 100);
          hasData = true;
        }
      } else if (cat.code === 'LIBRARY') {
        if (student.libraryRecords.length > 0) {
          const earned = student.libraryRecords.reduce((acc, r) => acc + (r.readingScore || 0), 0);
          catPct = Math.min(Math.max(Number(((earned / libraryRefPoints) * 100).toFixed(2)), 0), 100);
          hasData = true;
        }
      } else if (cat.code === 'LITERARY' || cat.code === 'PROGRAMS') {
        const records = student.performanceRecords.filter((r) => r.categoryId === cat.id);
        if (records.length > 0) {
          let totalPts = 0;
          records.forEach((r) => {
            const mult = resolveLevelMultiplier(r.level, levelsList);
            const prizeBase = resolvePrizeBaseScore(r.position, settings);
            const baseScore = prizeBase > 0 ? prizeBase : (r.obtainedScore || 0);
            totalPts += (baseScore * mult);
          });
          catPct = Math.min(Math.max(Number(((totalPts / achievementRefPoints) * 100).toFixed(2)), 0), 100);
          hasData = true;
        }
      } else {
        const records = student.performanceRecords.filter((r) => r.categoryId === cat.id);
        if (records.length > 0) {
          const sum = records.reduce((acc, r) => acc + (r.percentage || 0), 0);
          catPct = Math.min(Math.max(Number((sum / records.length).toFixed(2)), 0), 100);
          hasData = true;
        }
      }

      categoryPercentages[cat.id] = catPct;

      if (isIncluded) {
        weightedSum += (catPct * weight) / 100;
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
      const matchedCategory = categories.find(
        (c) =>
          c.id === filters.categoryId ||
          c.code?.toUpperCase() === filters.categoryId?.toUpperCase() ||
          c.name?.toLowerCase() === filters.categoryId?.toLowerCase()
      );
      finalScore = matchedCategory ? (categoryPercentages[matchedCategory.id] || 0) : (categoryPercentages[filters.categoryId] || 0);
    } else {
      finalScore = Math.min(Math.max(Number(weightedSum.toFixed(2)), 0), 100);
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

  const isOverall = !filters?.categoryId && !filters?.subcategoryId && !filters?.fest && !filters?.stream;
  let rankedEntries = isOverall ? entries : entries.filter((e) => (e.spr || 0) > 0);

  rankedEntries.sort((a, b) => {
    if (b.spr !== a.spr) return b.spr - a.spr;
    if ((b.recordsCount || 0) !== (a.recordsCount || 0)) {
      return (b.recordsCount || 0) - (a.recordsCount || 0);
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  for (let i = 0; i < rankedEntries.length; i++) {
    if (i > 0 && rankedEntries[i].spr === rankedEntries[i - 1].spr) {
      rankedEntries[i].rank = rankedEntries[i - 1].rank;
    } else {
      rankedEntries[i].rank = i + 1;
    }
  }

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
