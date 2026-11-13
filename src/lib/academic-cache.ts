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
