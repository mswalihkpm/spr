import { onInvalidateEngine } from './spr-engine';

// ==========================================
// 1. Student Auth & Profile Cache (/api/student/auth/me)
// ==========================================
export const studentMeCache = new Map<string, { timestamp: number; data: any }>();
export const inFlightStudentMePromises = new Map<string, Promise<any>>();
export const STUDENT_ME_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function invalidateStudentMeCache(studentId?: string) {
  if (studentId) {
    studentMeCache.delete(studentId);
  } else {
    studentMeCache.clear();
  }
}

// ==========================================
// 2. Admin Student Details Master Cache (/api/admin/student-details)
// ==========================================
export let masterStudentDetailsCache: {
  timestamp: number;
  students: any[];
  totalQuestionnairesCount: number;
} | null = null;

export let inFlightMasterStudentDetailsPromise: Promise<{
  timestamp: number;
  students: any[];
  totalQuestionnairesCount: number;
}> | null = null;

export const ADMIN_DETAILS_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export function setMasterStudentDetailsCache(data: {
  timestamp: number;
  students: any[];
  totalQuestionnairesCount: number;
} | null) {
  masterStudentDetailsCache = data;
}

export function setInFlightMasterStudentDetailsPromise(
  promise: Promise<{
    timestamp: number;
    students: any[];
    totalQuestionnairesCount: number;
  }> | null
) {
  inFlightMasterStudentDetailsPromise = promise;
}

export function invalidateAdminStudentDetailsCache() {
  masterStudentDetailsCache = null;
}

// ==========================================
// 3. Admin Dynamic Student Groups Cache (/api/admin/student-details/groups)
// ==========================================
export let cachedAdminGroups: { timestamp: number; data: any[] } | null = null;
export let inFlightAdminGroupsPromise: Promise<any[]> | null = null;
export const ADMIN_GROUPS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function setCachedAdminGroups(data: { timestamp: number; data: any[] } | null) {
  cachedAdminGroups = data;
}

export function setInFlightAdminGroupsPromise(promise: Promise<any[]> | null) {
  inFlightAdminGroupsPromise = promise;
}

export function invalidateAdminGroupsCache() {
  cachedAdminGroups = null;
}

// ==========================================
// Global Hook into Master SPR Engine Invalidation
// ==========================================
onInvalidateEngine(() => {
  invalidateStudentMeCache();
  invalidateAdminStudentDetailsCache();
  invalidateAdminGroupsCache();
});
