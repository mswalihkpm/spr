import { prisma } from '@/lib/prisma';
import { invalidateEngineCache } from '@/lib/spr-engine';
import { triggerAcademicRevalidation } from '@/lib/cache-invalidation';

let cachedAcademicData: { timestamp: number; data: any } | null = null;
const ACADEMIC_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL (invalidated on mutation)

let cachedExamsMap = new Map<string, { timestamp: number; data: any }>();
const EXAMS_CACHE_TTL = 15 * 60 * 1000;

let cachedTermsResponse: { timestamp: number; data: any } | null = null;
const TERMS_CACHE_TTL = 15 * 60 * 1000;

let cachedClassesList: { timestamp: number; data: any } | null = null;
const CLASSES_CACHE_TTL = 15 * 60 * 1000;

export function getCachedAcademicData() {
  const now = Date.now();
  if (cachedAcademicData && now - cachedAcademicData.timestamp < ACADEMIC_CACHE_TTL_MS) {
    return cachedAcademicData.data;
  }
  return null;
}

export function setCachedAcademicData(data: any) {
  cachedAcademicData = { timestamp: Date.now(), data };
}

export async function getCachedAcademicClasses() {
  const now = Date.now();
  if (cachedClassesList && now - cachedClassesList.timestamp < CLASSES_CACHE_TTL) {
    return cachedClassesList.data;
  }
  const classes = await prisma.academicClass.findMany({
    where: { active: true },
    select: { id: true, name: true, numericGrade: true },
    orderBy: { numericGrade: 'asc' },
  });
  cachedClassesList = { timestamp: now, data: classes };
  return classes;
}

export function getCachedExams(key: string) {
  const cached = cachedExamsMap.get(key);
  if (cached && Date.now() - cached.timestamp < EXAMS_CACHE_TTL) {
    return cached.data;
  }
  return null;
}

export function setCachedExams(key: string, data: any) {
  cachedExamsMap.set(key, { timestamp: Date.now(), data });
}

export function getCachedTerms() {
  const now = Date.now();
  if (cachedTermsResponse && now - cachedTermsResponse.timestamp < TERMS_CACHE_TTL) {
    return cachedTermsResponse.data;
  }
  return null;
}

export function setCachedTerms(data: any) {
  cachedTermsResponse = { timestamp: Date.now(), data };
}

export function invalidateAcademicCache() {
  cachedAcademicData = null;
  cachedExamsMap.clear();
  cachedTermsResponse = null;
  cachedClassesList = null;
  invalidateEngineCache();
  triggerAcademicRevalidation();
}

export async function fetchOrGetAcademicMasterData(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = getCachedAcademicData();
    if (cached) return cached;
  }

  const [
    schools,
    classes,
    academicYears,
    terms,
    exams,
    subjects,
    levels,
    institutions,
    boards,
    categories,
    programs,
    competitions,
    literaryEvents,
  ] = await Promise.all([
    prisma.school.findMany({ select: { id: true, name: true, code: true, active: true }, orderBy: { name: 'asc' } }),
    prisma.academicClass.findMany({ select: { id: true, name: true, numericGrade: true, active: true }, orderBy: { numericGrade: 'asc' } }),
    prisma.academicYear.findMany({ select: { id: true, name: true, isCurrent: true, startDate: true, endDate: true }, orderBy: { name: 'desc' } }),
    prisma.term.findMany({ select: { id: true, name: true, code: true, academicYearId: true, isCurrent: true }, orderBy: { name: 'asc' } }),
    prisma.exam.findMany({
      select: {
        id: true,
        name: true,
        categoryId: true,
        termId: true,
        academicYearId: true,
        maxScore: true,
        targetScore: true,
        category: { select: { id: true, name: true, code: true } },
        term: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.subject.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        categoryId: true,
        institutionId: true,
        boardId: true,
        maxScore: true,
        category: { select: { id: true, name: true, code: true } },
        institution: { select: { id: true, name: true, code: true } },
        board: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.level.findMany({ select: { id: true, name: true, code: true, weightMultiplier: true, displayOrder: true, active: true }, orderBy: { displayOrder: 'asc' } }),
    prisma.academicInstitution.findMany({ select: { id: true, name: true, code: true, active: true }, orderBy: { name: 'asc' } }),
    prisma.boardSyllabus.findMany({ select: { id: true, name: true, code: true, active: true }, orderBy: { name: 'asc' } }),
    prisma.category.findMany({ select: { id: true, code: true, name: true, icon: true, isSystem: true, active: true, displayOrder: true, defaultWeight: true, includeInSPR: true }, orderBy: { displayOrder: 'asc' } }),
    prisma.program.findMany({
      select: {
        id: true,
        name: true,
        organizer: true,
        academicYearId: true,
        levelId: true,
        date: true,
        level: { select: { id: true, name: true } },
        competitions: { select: { id: true, name: true, maxScore: true } },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.competition.findMany({
      select: {
        id: true,
        name: true,
        programId: true,
        maxScore: true,
        program: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.literaryEvent.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        academicYearId: true,
        date: true,
        competitions: { select: { id: true, name: true, maxScore: true } },
      },
      orderBy: { date: 'desc' },
    }),
  ]);

  const payload = {
    schools,
    classes,
    academicYears,
    terms,
    exams,
    subjects,
    levels,
    institutions,
    boards,
    categories,
    programs,
    competitions,
    literaryEvents,
  };

  setCachedAcademicData(payload);
  return payload;
}
