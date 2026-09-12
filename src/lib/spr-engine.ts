import { prisma } from './prisma';
import { MissingDataRule, CategorySummary, StudentSPRProfile, LeaderboardEntry } from '@/types';

// High-performance server-side in-memory cache with TTL for ultra-fast loading
const leaderboardCache = new Map<string, { timestamp: number; data: LeaderboardEntry[] }>();
const studentSPRProfileCache = new Map<string, { timestamp: number; data: StudentSPRProfile }>();
let cachedMissingDataRule: { timestamp: number; value: MissingDataRule } | null = null;
let cachedCategories: { timestamp: number; data: any[] } | null = null;
let cachedSettings: { timestamp: number; data: Record<string, string> } | null = null;
let cachedLevels: { timestamp: number; data: any[] } | null = null;
let cachedCreativeCategories: { timestamp: number; data: any[] } | null = null;

const CACHE_TTL_MS = 30 * 1000; // 30 seconds TTL

export function invalidateEngineCache() {
  leaderboardCache.clear();
  studentSPRProfileCache.clear();
  cachedMissingDataRule = null;
  cachedCategories = null;
  cachedSettings = null;
  cachedLevels = null;
  cachedCreativeCategories = null;
}

export function formatPoints(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '0';
  if (Number.isInteger(val)) {
    return val.toLocaleString('en-US');
  }
  const fixed = Number(val.toFixed(2));
  return fixed.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
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
    CREATIVE_BASE_ARTICLE: '50',
    CREATIVE_BASE_RESEARCH: '100',
    CREATIVE_BASE_STORY: '75',
    CREATIVE_BASE_POEM: '50',
    CREATIVE_BASE_RESPONSE: '40',
    CREATIVE_BASE_LETTER: '30',
    CREATIVE_BASE_REVIEW: '50',
    CREATIVE_BASE_OTHERS: '30',
    QUALIFICATION_BASE_DEFAULT: '50',
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

export async function getCachedCreativeCategories() {
  const now = Date.now();
  if (cachedCreativeCategories && now - cachedCreativeCategories.timestamp < CACHE_TTL_MS) {
    return cachedCreativeCategories.data;
  }
  const creativeCats = await prisma.creativeHubCategory.findMany({
    where: { active: true },
    orderBy: { displayOrder: 'asc' },
  });
  cachedCreativeCategories = { timestamp: now, data: creativeCats };
  return creativeCats;
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

export const DEFAULT_CATEGORY_WEIGHTS: Record<string, number> = {
  ISLAMIC: 1.0,
  SCHOOL: 1.0,
  QUALIFICATION: 1.0,
  CREATIVE_HUB: 1.0,
  LIBRARY: 1.0,
  LITERARY: 1.0,
  PROGRAMS: 1.0,
};

export function resolveCategoryWeight(cat: any): number {
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

// Helper to resolve creative hub base score
export function resolveCreativeBaseScore(codeOrName: string, settings: Record<string, string>): number {
  const key = (codeOrName || '').toUpperCase();
  if (key.includes('RESEARCH')) return parseFloat(settings.CREATIVE_BASE_RESEARCH || '100') || 100;
  if (key.includes('STORY')) return parseFloat(settings.CREATIVE_BASE_STORY || '75') || 75;
  if (key.includes('ARTICLE')) return parseFloat(settings.CREATIVE_BASE_ARTICLE || '50') || 50;
  if (key.includes('POEM')) return parseFloat(settings.CREATIVE_BASE_POEM || '50') || 50;
  if (key.includes('REVIEW')) return parseFloat(settings.CREATIVE_BASE_REVIEW || '50') || 50;
  if (key.includes('RESPONSE')) return parseFloat(settings.CREATIVE_BASE_RESPONSE || '40') || 40;
  if (key.includes('LETTER')) return parseFloat(settings.CREATIVE_BASE_LETTER || '30') || 30;
  return parseFloat(settings.CREATIVE_BASE_OTHERS || '30') || 30;
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

  const [categories, settings, levelsList, creativeCatsList] = await Promise.all([
    getCachedCategories(),
    getCachedSettings(),
    getCachedLevels(),
    getCachedCreativeCategories(),
  ]);

  const parsedCategories = categories.map((cat) => {
    const activeWeightRecord = cat.categoryWeights?.find((w: any) => w.isActive !== false) || cat.categoryWeights?.[0];
    const isCatActive = activeWeightRecord?.isActive ?? cat.active;
    const isIncluded = activeWeightRecord?.isIncludedInSPR ?? cat.includeInSPR;

    return {
      cat,
      isCatActive,
      isIncluded,
    };
  });

  const categorySummaries: CategorySummary[] = [];
  let missingCategoriesCount = 0;

  for (const { cat, isCatActive, isIncluded } of parsedCategories) {
    if (!isCatActive) continue;

    const categoryRecords = student.performanceRecords.filter((r) => r.categoryId === cat.id);
    let earnedPoints = 0;
    let rawInput = '—';
    let formula = '';
    let recordsCount = categoryRecords.length;
    let itemizedRecords: any[] = [];
    let hasData = false;

    // 1. ISLAMIC STUDIES
    if (cat.code === 'ISLAMIC') {
      if (categoryRecords.length > 0) {
        hasData = true;
        let sumPoints = 0;
        itemizedRecords = categoryRecords.map((r: any) => {
          const mult = typeof r.subcategory?.weight === 'number' && r.subcategory.weight > 0 ? r.subcategory.weight : 1.0;
          const baseScore = r.obtainedScore || 0;
          const pts = Number((baseScore * mult).toFixed(2));
          sumPoints += pts;

          return {
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
            earnedPoints: pts,
            multiplier: mult,
            remarks: r.remarks,
            date: r.date ? r.date.toISOString() : null,
          };
        });

        earnedPoints = Number(sumPoints.toFixed(2));
        rawInput = `${formatPoints(earnedPoints)} pts`;
        formula = `${categoryRecords.length} assessment(s) = +${formatPoints(earnedPoints)} SPR Points`;
      } else {
        formula = `No Islamic Studies assessments logged (+0 SPR Points)`;
      }
    }

    // 2. SCHOOL STUDIES
    else if (cat.code === 'SCHOOL') {
      if (categoryRecords.length > 0) {
        hasData = true;

        // Group records by exam session to compute % of total marks and convert to 130-mark scale
        const examGroups = new Map<string, any[]>();
        categoryRecords.forEach((r: any) => {
          const key = r.examId || r.exam?.name || 'DEFAULT_EXAM';
          if (!examGroups.has(key)) examGroups.set(key, []);
          examGroups.get(key)!.push(r);
        });

        let sumPoints = 0;
        const examSummaries: string[] = [];

        examGroups.forEach((recs) => {
          const examName = recs[0]?.exam?.name || 'School Examination';
          const totObt = recs.reduce((sum: number, r: any) => sum + (r.obtainedScore || 0), 0);
          const totMax = recs.reduce((sum: number, r: any) => sum + (r.maxScore || 100), 0);
          const pct = totMax > 0 ? (totObt / totMax) * 100 : 0;
          // Convert % of total mark to 130 mark
          const exam130Score = Number(((pct / 100) * 130).toFixed(2));
          sumPoints += exam130Score;
          examSummaries.push(
            `${examName}: ${totObt}/${totMax} (${pct.toFixed(2)}%) → ${formatPoints(exam130Score)}/130 pts`
          );
        });

        itemizedRecords = categoryRecords.map((r: any) => {
          const mult = typeof r.subcategory?.weight === 'number' && r.subcategory.weight > 0 ? r.subcategory.weight : 1.0;
          const baseScore = r.obtainedScore || 0;
          const max = r.maxScore || 100;
          const recordPct = max > 0 ? (baseScore / max) * 100 : baseScore;
          const scaled130 = Number(((recordPct / 100) * 130).toFixed(2));

          return {
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
            percentage: r.percentage !== undefined && r.percentage !== null ? r.percentage : recordPct,
            earnedPoints: scaled130,
            multiplier: mult,
            remarks: r.remarks,
            date: r.date ? r.date.toISOString() : null,
          };
        });

        earnedPoints = Number(sumPoints.toFixed(2));
        rawInput = `${formatPoints(earnedPoints)} / 130 pts`;
        formula = `${examSummaries.join('; ')} = +${formatPoints(earnedPoints)} SPR Points`;
      } else {
        formula = `No School academic marks logged (+0 SPR Points)`;
      }
    }

    // 3. QUALIFICATION
    else if (cat.code === 'QUALIFICATION') {
      if (categoryRecords.length > 0) {
        hasData = true;
        let sumPoints = 0;
        itemizedRecords = categoryRecords.map((r: any) => {
          const mult = typeof r.subcategory?.weight === 'number' && r.subcategory.weight > 0 ? r.subcategory.weight : 1.0;
          const baseScore = r.obtainedScore > 0 ? r.obtainedScore : (r.subcategory?.maxScore || 50);
          const pts = Number((baseScore * mult).toFixed(2));
          sumPoints += pts;

          return {
            id: r.id,
            categoryId: r.categoryId,
            categoryCode: 'QUALIFICATION',
            categoryName: cat.name,
            name: r.subcategory?.name || r.subject?.name || 'Qualification Milestone',
            subCategoryName: r.subcategory?.name || 'General Qualification',
            levelName: r.level?.name,
            obtainedScore: r.obtainedScore,
            maxScore: r.maxScore,
            percentage: r.percentage,
            earnedPoints: pts,
            multiplier: mult,
            position: r.position,
            grade: r.grade,
            remarks: r.remarks,
            date: r.date ? r.date.toISOString() : null,
          };
        });

        earnedPoints = Number(sumPoints.toFixed(2));
        rawInput = `${formatPoints(earnedPoints)} pts`;
        formula = `${categoryRecords.length} qualification(s) = +${formatPoints(earnedPoints)} SPR Points`;
      } else {
        formula = `No Qualification records logged (+0 SPR Points)`;
      }
    }

    // 4. CREATIVE HUB
    else if (cat.code === 'CREATIVE_HUB') {
      const works = student.creativeWorks || [];
      if (works.length > 0) {
        hasData = true;
        recordsCount = works.length;
        let sumPoints = 0;

        itemizedRecords = works.map((w: any) => {
          const rawScore = typeof w.score === 'number' && w.score > 0
            ? w.score
            : (typeof w.category?.weight === 'number' && w.category.weight > 0 ? w.category.weight : 20);
          const pts = Number(rawScore.toFixed(2));
          sumPoints += pts;

          return {
            id: w.id,
            title: w.title,
            name: w.title,
            categoryName: cat.name,
            categoryCode: 'CREATIVE_HUB',
            subCategoryName: w.category?.name || 'Creative Work',
            type: 'CREATIVE',
            publicationStatus: w.publicationStatus,
            rating: w.rating,
            percentage: w.percentage,
            obtainedScore: rawScore,
            basePoints: rawScore,
            multiplier: 1.0,
            earnedPoints: pts,
            mediaUrl: w.mediaUrl,
            date: w.date ? w.date.toISOString() : null,
            remarks: w.remarks || w.description,
          };
        });

        earnedPoints = Number(sumPoints.toFixed(2));
        rawInput = `${formatPoints(earnedPoints)} pts`;
        formula = `${works.length} creative work(s) = +${formatPoints(earnedPoints)} SPR Points`;
      } else {
        formula = `No Creative Hub submissions logged (+0 SPR Points)`;
      }
    }

    // 5. LIBRARY & READING
    else if (cat.code === 'LIBRARY') {
      const libRecords = student.libraryRecords || [];
      if (libRecords.length > 0) {
        hasData = true;
        recordsCount = libRecords.length;
        let sumPoints = 0;

        itemizedRecords = libRecords.map((lib: any) => {
          const pts = typeof lib.readingScore === 'number' && lib.readingScore > 0
            ? lib.readingScore
            : ((lib.booksRead || 0) * 20);
          sumPoints += pts;

          return {
            id: lib.id,
            name: lib.readingPeriod || 'Reading Milestone',
            title: lib.readingPeriod || 'Reading Milestone',
            categoryName: cat.name,
            categoryCode: 'LIBRARY',
            readingPeriod: lib.readingPeriod,
            booksRead: lib.booksRead,
            pagesRead: lib.pagesRead,
            type: 'LIBRARY',
            earnedPoints: pts,
            obtainedScore: pts,
            readingScore: lib.readingScore,
            remarks: lib.remarks,
            date: lib.createdAt ? lib.createdAt.toISOString() : null,
          };
        });

        earnedPoints = Number(sumPoints.toFixed(2));
        rawInput = `${formatPoints(earnedPoints)} pts`;
        formula = `Pure Reading Points (No Cap) = +${formatPoints(earnedPoints)} SPR Points`;
      } else {
        formula = `No Reading records logged (+0 SPR Points)`;
      }
    }

    // 6. LITERARY PROGRAMMES
    else if (cat.code === 'LITERARY') {
      if (categoryRecords.length > 0) {
        hasData = true;
        let sumPoints = 0;
        itemizedRecords = categoryRecords.map((r: any) => {
          const mult = resolveLevelMultiplier(r.level, levelsList);
          const prizeBase = resolvePrizeBaseScore(r.position, settings);
          const baseScore = prizeBase > 0 ? prizeBase : (r.obtainedScore || 0);
          const pts = Number((baseScore * mult).toFixed(2));
          sumPoints += pts;

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
            basePoints: baseScore,
            earnedPoints: pts,
            obtainedScore: pts,
            remarks: r.remarks,
            date: r.date ? r.date.toISOString() : null,
          };
        });

        earnedPoints = Number(sumPoints.toFixed(2));
        rawInput = `${formatPoints(earnedPoints)} pts`;
        formula = `${categoryRecords.length} literary achievement(s) = +${formatPoints(earnedPoints)} SPR Points`;
      } else {
        formula = `No Literary achievements logged (+0 SPR Points)`;
      }
    }

    // 7. PROGRAMMES & COMPETITIONS
    else if (cat.code === 'PROGRAMS') {
      if (categoryRecords.length > 0) {
        hasData = true;
        let sumPoints = 0;
        itemizedRecords = categoryRecords.map((r: any) => {
          const mult = resolveLevelMultiplier(r.level, levelsList);
          const prizeBase = resolvePrizeBaseScore(r.position, settings);
          const baseScore = prizeBase > 0 ? prizeBase : (r.obtainedScore || 0);
          const pts = Number((baseScore * mult).toFixed(2));
          sumPoints += pts;

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
            basePoints: baseScore,
            earnedPoints: pts,
            obtainedScore: pts,
            remarks: r.remarks,
            date: r.date ? r.date.toISOString() : null,
          };
        });

        earnedPoints = Number(sumPoints.toFixed(2));
        rawInput = `${formatPoints(earnedPoints)} pts`;
        formula = `${categoryRecords.length} competition achievement(s) = +${formatPoints(earnedPoints)} SPR Points`;
      } else {
        formula = `No Competition achievements logged (+0 SPR Points)`;
      }
    }

    // CUSTOM / OTHER EXTENSION CATEGORIES
    else {
      if (categoryRecords.length > 0) {
        hasData = true;
        let sumPoints = 0;
        itemizedRecords = categoryRecords.map((r: any) => {
          const mult = typeof r.subcategory?.weight === 'number' && r.subcategory.weight > 0 ? r.subcategory.weight : 1.0;
          const baseScore = r.obtainedScore || 0;
          const pts = Number((baseScore * mult).toFixed(2));
          sumPoints += pts;
          return {
            id: r.id,
            categoryId: r.categoryId,
            categoryCode: cat.code,
            categoryName: cat.name,
            name: r.subcategory?.name || r.subject?.name || 'Assessment',
            obtainedScore: r.obtainedScore,
            earnedPoints: pts,
            date: r.date ? r.date.toISOString() : null,
          };
        });
        earnedPoints = Number(sumPoints.toFixed(2));
        rawInput = `${formatPoints(earnedPoints)} pts`;
        formula = `+${formatPoints(earnedPoints)} SPR Points`;
      } else {
        formula = `No records logged (+0 SPR Points)`;
      }
    }

    if (!hasData) {
      missingCategoriesCount++;
    }

    categorySummaries.push({
      categoryId: cat.id,
      categoryCode: cat.code,
      categoryName: cat.name,
      icon: cat.icon,
      priority: cat.displayOrder || 1,
      earnedPoints,
      rawInput,
      formula,
      recordsCount,
      isIncluded,
      records: itemizedRecords,
    });
  }

  // OVERALL SPR POINTS = Direct SUM of all valid earned numerical points across included categories
  const finalSPR = Number(
    categorySummaries.reduce((sum, cs) => sum + (cs.isIncluded ? cs.earnedPoints : 0), 0).toFixed(2)
  );

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
    totalPoints: finalSPR,
    rawWeightedTotal: finalSPR,
    maxWeightedTotal: finalSPR,
    normalizedScore: `${formatPoints(finalSPR)} Points`,
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
      creativeWorks: {
        include: {
          category: true,
        },
      },
      libraryRecords: true,
    },
  });

  const [categories, settings, levelsList] = await Promise.all([
    getCachedCategories(),
    getCachedSettings(),
    getCachedLevels(),
  ]);

  const parsedCategories = categories.map((cat) => {
    const activeWeightRecord = cat.categoryWeights?.find((w: any) => w.isActive !== false) || cat.categoryWeights?.[0];
    const isCatActive = activeWeightRecord?.isActive ?? cat.active;
    const isIncluded = activeWeightRecord?.isIncludedInSPR ?? cat.includeInSPR;

    return {
      cat,
      isCatActive,
      isIncluded,
    };
  });

  const entries: LeaderboardEntry[] = [];

  for (const student of students) {
    const categoryPoints: Record<string, number> = {};
    let totalPoints = 0;
    let totalRecords = student.performanceRecords.length + student.creativeWorks.length + student.libraryRecords.length;

    // Subcategory-specific calculation if requested
    let subcategoryScore = 0;
    let subcategoryRecordsCount = 0;
    if (filters?.subcategoryId) {
      const subRecords = (student.performanceRecords as any[]).filter(
        (r) => r.subcategoryId === filters.subcategoryId
      );
      if (subRecords.length > 0) {
        let subSum = 0;
        subRecords.forEach((r) => {
          const mult = typeof r.subcategory?.weight === 'number' && r.subcategory.weight > 0 ? r.subcategory.weight : 1.0;
          const base = r.obtainedScore || 0;
          subSum += (base * mult);
        });
        subcategoryScore = Number(subSum.toFixed(2));
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
        let streamSum = 0;
        streamRecords.forEach((r) => {
          const mult = typeof r.subcategory?.weight === 'number' && r.subcategory.weight > 0 ? r.subcategory.weight : 1.0;
          const base = r.obtainedScore || 0;
          streamSum += (base * mult);
        });
        streamIslamicScore = Number(streamSum.toFixed(2));
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
        let fSum = 0;
        festRecords.forEach((r) => {
          const mult = resolveLevelMultiplier(r.level, levelsList);
          const prizeBase = resolvePrizeBaseScore(r.position, settings);
          const base = prizeBase > 0 ? prizeBase : (r.obtainedScore || 0);
          fSum += (base * mult);
        });
        festScore = Number(fSum.toFixed(2));
        festRecordsCount = festRecords.length;
      } else {
        const litRecords = student.performanceRecords.filter((r) => r.category?.code === 'LITERARY');
        if (litRecords.length > 0) {
          let fSum = 0;
          litRecords.forEach((r) => {
            const mult = resolveLevelMultiplier(r.level, levelsList);
            const prizeBase = resolvePrizeBaseScore(r.position, settings);
            const base = prizeBase > 0 ? prizeBase : (r.obtainedScore || 0);
            fSum += (base * mult);
          });
          festScore = Number(fSum.toFixed(2));
          festRecordsCount = litRecords.length;
        }
      }
    }

    for (const { cat, isCatActive, isIncluded } of parsedCategories) {
      if (!isCatActive) continue;

      let catEarned = 0;

      if (cat.code === 'CREATIVE_HUB') {
        student.creativeWorks.forEach((w) => {
          const rawScore = typeof w.score === 'number' && w.score > 0
            ? w.score
            : (typeof w.category?.weight === 'number' && w.category.weight > 0 ? w.category.weight : 20);
          catEarned += rawScore;
        });
      } else if (cat.code === 'LIBRARY') {
        student.libraryRecords.forEach((lib) => {
          const pts = typeof lib.readingScore === 'number' && lib.readingScore > 0
            ? lib.readingScore
            : ((lib.booksRead || 0) * 20);
          catEarned += pts;
        });
      } else if (cat.code === 'LITERARY' || cat.code === 'PROGRAMS') {
        const records = student.performanceRecords.filter((r) => r.categoryId === cat.id);
        records.forEach((r) => {
          const mult = resolveLevelMultiplier(r.level, levelsList);
          const prizeBase = resolvePrizeBaseScore(r.position, settings);
          const baseScore = prizeBase > 0 ? prizeBase : (r.obtainedScore || 0);
          catEarned += (baseScore * mult);
        });
      } else if (cat.code === 'SCHOOL') {
        const records = student.performanceRecords.filter((r) => r.categoryId === cat.id);
        if (records.length > 0) {
          const examGroups = new Map<string, any[]>();
          records.forEach((r: any) => {
            const key = r.examId || (r.exam?.name) || 'DEFAULT_EXAM';
            if (!examGroups.has(key)) examGroups.set(key, []);
            examGroups.get(key)!.push(r);
          });
          let catSum = 0;
          examGroups.forEach((recs) => {
            const totObt = recs.reduce((sum: number, r: any) => sum + (r.obtainedScore || 0), 0);
            const totMax = recs.reduce((sum: number, r: any) => sum + (r.maxScore || 100), 0);
            const pct = totMax > 0 ? (totObt / totMax) * 100 : 0;
            catSum += ((pct / 100) * 130);
          });
          catEarned = Number(catSum.toFixed(2));
        }
      } else {
        const records = student.performanceRecords.filter((r) => r.categoryId === cat.id);
        records.forEach((r) => {
          const mult = typeof r.subcategory?.weight === 'number' && r.subcategory.weight > 0 ? r.subcategory.weight : 1.0;
          const base = r.obtainedScore || 0;
          catEarned += (base * mult);
        });
      }

      catEarned = Number(catEarned.toFixed(2));
      categoryPoints[cat.id] = catEarned;

      if (isIncluded) {
        totalPoints += catEarned;
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
      finalScore = matchedCategory ? (categoryPoints[matchedCategory.id] || 0) : (categoryPoints[filters.categoryId] || 0);
    } else {
      finalScore = Number(totalPoints.toFixed(2));
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
      totalSprPoints: finalScore,
      photoUrl: student.photoUrl,
      division: student.division,
      categoryPoints,
      categoryPercentages: categoryPoints,
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

