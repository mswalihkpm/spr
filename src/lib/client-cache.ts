/**
 * SPR Client-Side Request Deduplication & Data Fetching Cache
 * 
 * Objectives:
 * 1. Eliminate duplicate simultaneous API requests via in-flight Promise deduplication.
 * 2. Cache public master data client-side with exact TTL configurations.
 * 3. Enforce strict security boundaries: never cache private/authenticated student endpoints.
 * 4. Provide instant invalidation across tabs and component remounts upon admin mutations.
 * 5. Zero external dependencies (no SWR, no React Query).
 */

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Configured Stale-Time (TTL) in milliseconds
export const CLIENT_CACHE_TTLS: Record<string, number> = {
  '/api/bootstrap': 10 * 60 * 1000,            // 10 minutes (unified cold-start bootstrap)
  '/api/categories': 24 * 60 * 60 * 1000,      // 24 hours
  '/api/subcategories': 24 * 60 * 60 * 1000,   // 24 hours
  '/api/settings': 24 * 60 * 60 * 1000,        // 24 hours
  '/api/academic': 24 * 60 * 60 * 1000,        // 24 hours
  '/api/news': 30 * 60 * 1000,                 // 30 minutes
  '/api/leaderboard': 10 * 60 * 1000,          // 10 minutes
  '/api/display': 15 * 60 * 1000,              // 15 minutes
  '/api/notifications': 5 * 60 * 1000,         // 5 minutes
  '/api/public/student': 2 * 60 * 1000,        // 2 minutes (Public Scorecards)
};

// Endpoints strictly permitted for shared client caching (all other endpoints have TTL = 0)
const PUBLIC_CACHEABLE_PREFIXES = [
  '/api/bootstrap',
  '/api/categories',
  '/api/subcategories',
  '/api/settings',
  '/api/academic',
  '/api/news',
  '/api/notifications',
  '/api/leaderboard',
  '/api/display',
  '/api/public/student',
];

const PERSISTENT_CACHE_PREFIX = 'spr_pub_v1:';

// Endpoints that MUST NEVER be cached under any circumstances (Private / Authenticated)
const NEVER_CACHE_PREFIXES = [
  '/api/scores',
  '/api/students',
  '/api/analytics',
  '/api/auth',
  '/api/student',
  '/api/admin',
  '/api/audit-logs',
  '/api/weights',
];

// In-memory module-level storage
const memoryCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Determine default TTL for a given URL
 */
export function getEndpointTTL(url: string): number {
  const parsedUrl = url.split('?')[0];

  // Strictly enforce never-cache list
  for (const prefix of NEVER_CACHE_PREFIXES) {
    if (parsedUrl.startsWith(prefix)) {
      return 0;
    }
  }

  // Check exact configured TTLs
  for (const [prefix, ttl] of Object.entries(CLIENT_CACHE_TTLS)) {
    if (parsedUrl === prefix || parsedUrl.startsWith(prefix + '/')) {
      return ttl;
    }
  }

  // Not in public whitelist
  return 0;
}

/**
 * Normalizes URL for cache key resolution
 */
function normalizeCacheKey(url: string): string {
  try {
    // If relative, use dummy base to parse query params consistently
    const parsed = new URL(url, 'http://localhost');
    // Sort query parameters to avoid duplicate cache keys for ?a=1&b=2 vs ?b=2&a=1
    parsed.searchParams.sort();
    return parsed.pathname + (parsed.searchParams.toString() ? `?${parsed.searchParams.toString()}` : '');
  } catch {
    return url;
  }
}

/**
 * Check if endpoint is safe for public client caching
 */
function isCacheableEndpoint(url: string): boolean {
  const parsedUrl = url.split('?')[0];
  for (const prefix of NEVER_CACHE_PREFIXES) {
    if (parsedUrl.startsWith(prefix)) return false;
  }
  for (const prefix of PUBLIC_CACHEABLE_PREFIXES) {
    if (parsedUrl === prefix || parsedUrl.startsWith(prefix + '/')) return true;
  }
  return false;
}

export interface FetchOptions extends RequestInit {
  ttl?: number;
  forceRefresh?: boolean;
}

function readPersistentCache<T = any>(key: string, now: number): CacheEntry<T> | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(PERSISTENT_CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.timestamp !== 'number' || typeof parsed.ttl !== 'number') {
      return null;
    }
    if (now - parsed.timestamp >= parsed.ttl) {
      window.localStorage.removeItem(PERSISTENT_CACHE_PREFIX + key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writePersistentCache(key: string, entry: CacheEntry): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(PERSISTENT_CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Quota exceeded: clear oldest spr_pub_v1 entries and retry once quietly
    try {
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(PERSISTENT_CACHE_PREFIX)) {
          window.localStorage.removeItem(k);
        }
      }
      window.localStorage.setItem(PERSISTENT_CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {
      // Ignore storage errors in private/restricted browsers
    }
  }
}

export function seedClientCache(url: string, data: any, customTtl?: number): void {
  if (!isCacheableEndpoint(url)) return;
  const key = normalizeCacheKey(url);
  const ttl = customTtl ?? getEndpointTTL(url);
  if (ttl <= 0) return;
  const entry: CacheEntry = { data, timestamp: Date.now(), ttl };
  memoryCache.set(key, entry);
  writePersistentCache(key, entry);
}

/**
 * Deduplicated client fetch with in-memory + persistent localStorage TTL caching (public endpoints only)
 */
export async function fetchWithDedupe<T = any>(
  url: string,
  options?: FetchOptions
): Promise<T> {
  const method = (options?.method || 'GET').toUpperCase();
  const forceRefresh = options?.forceRefresh ?? false;

  // Non-GET requests (mutations) bypass cache and in-flight deduplication completely
  if (method !== 'GET') {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  const key = normalizeCacheKey(url);
  const now = Date.now();
  const configuredTTL = options?.ttl !== undefined ? options.ttl : getEndpointTTL(url);
  const cacheable = isCacheableEndpoint(url) && configuredTTL > 0;

  // 1. Return fresh cached data from RAM or persistent localStorage if available
  if (!forceRefresh && cacheable) {
    const cached = memoryCache.get(key);
    if (cached && now - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }
    const persisted = readPersistentCache<T>(key, now);
    if (persisted) {
      memoryCache.set(key, persisted);
      return persisted.data;
    }
  }

  // 2. Reuse in-flight request if already pending
  if (!forceRefresh && inFlightRequests.has(key)) {
    return inFlightRequests.get(key) as Promise<T>;
  }

  // 3. Initiate network request with promise deduplication
  const fetchPromise = (async () => {
    try {
      const fetchHeaders = new Headers(options?.headers || {});
      if (forceRefresh) {
        fetchHeaders.set('Cache-Control', 'no-cache');
      }

      const res = await fetch(url, {
        ...options,
        headers: fetchHeaders,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      // Store in memory & persistent public cache if cacheable
      if (cacheable) {
        const entry: CacheEntry = {
          data,
          timestamp: Date.now(),
          ttl: configuredTTL,
        };
        memoryCache.set(key, entry);
        writePersistentCache(key, entry);
      }

      return data as T;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, fetchPromise);
  return fetchPromise;
}

/**
 * Invalidate client cache by URL pattern or clear all public caches
 */
export function invalidateClientCache(pattern?: string | RegExp): void {
  if (!pattern) {
    memoryCache.clear();
    inFlightRequests.clear();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        for (let i = window.localStorage.length - 1; i >= 0; i--) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(PERSISTENT_CACHE_PREFIX)) {
            window.localStorage.removeItem(k);
          }
        }
      } catch {
        // Ignore storage errors
      }
    }
  } else {
    Array.from(memoryCache.keys()).forEach((key) => {
      const matches = typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key);
      if (matches) {
        memoryCache.delete(key);
      }
    });
    Array.from(inFlightRequests.keys()).forEach((key) => {
      const matches = typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key);
      if (matches) {
        inFlightRequests.delete(key);
      }
    });
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        for (let i = window.localStorage.length - 1; i >= 0; i--) {
          const fullKey = window.localStorage.key(i);
          if (fullKey && fullKey.startsWith(PERSISTENT_CACHE_PREFIX)) {
            const cacheKey = fullKey.slice(PERSISTENT_CACHE_PREFIX.length);
            const matches =
              typeof pattern === 'string'
                ? cacheKey.includes(pattern) || cacheKey.startsWith('/api/bootstrap')
                : pattern.test(cacheKey);
            if (matches) {
              window.localStorage.removeItem(fullKey);
            }
          }
        }
      } catch {
        // Ignore storage errors
      }
    }
  }

  // Broadcast invalidation event to active mounted components
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('spr-client-cache-invalidated', {
          detail: { pattern: typeof pattern === 'string' ? pattern : pattern?.source },
        })
      );
    } catch {
      // Ignore if event dispatch fails
    }
  }
}

// Client-side in-memory session cache for student authenticated dashboard
let cachedStudentData: any = null;
let lastStudentFetchTime = 0;
const STUDENT_CACHE_TTL = 60 * 1000; // 60 seconds

let cachedTasksData: any = null;
let lastTasksFetchTime = 0;
const TASKS_CACHE_TTL = 60 * 1000;

let cachedActivitiesData: any = null;
let lastActivitiesFetchTime = 0;
const ACTIVITIES_CACHE_TTL = 60 * 1000;

export function getCachedStudentDashboard() {
  if (cachedStudentData && Date.now() - lastStudentFetchTime < STUDENT_CACHE_TTL) {
    return cachedStudentData;
  }
  return null;
}

export function getCachedStudentProfile(): any | null {
  if (cachedStudentData && Date.now() - lastStudentFetchTime < STUDENT_CACHE_TTL) {
    return cachedStudentData.student || cachedStudentData;
  }
  return null;
}

export function setCachedStudentDashboard(data: any) {
  if (!data) return;
  // If updating with partial or lite student profile, merge into existing cached dashboard if present
  if (data.student && cachedStudentData && cachedStudentData.wallet) {
    cachedStudentData = {
      ...cachedStudentData,
      ...data,
      student: { ...cachedStudentData.student, ...data.student },
    };
  } else if (!data.student && data.fullName && cachedStudentData && cachedStudentData.wallet) {
    cachedStudentData = {
      ...cachedStudentData,
      student: { ...cachedStudentData.student, ...data },
    };
  } else {
    cachedStudentData = data;
  }
  lastStudentFetchTime = Date.now();
}

export function getCachedStudentTasks() {
  if (cachedTasksData && Date.now() - lastTasksFetchTime < TASKS_CACHE_TTL) {
    return cachedTasksData;
  }
  return null;
}

export function setCachedStudentTasks(data: any) {
  cachedTasksData = data;
  lastTasksFetchTime = Date.now();
}

export function getCachedStudentActivities() {
  if (cachedActivitiesData && Date.now() - lastActivitiesFetchTime < ACTIVITIES_CACHE_TTL) {
    return cachedActivitiesData;
  }
  return null;
}

export function setCachedStudentActivities(data: any) {
  cachedActivitiesData = data;
  lastActivitiesFetchTime = Date.now();
}

export function invalidateStudentClientCache() {
  cachedStudentData = null;
  lastStudentFetchTime = 0;
  cachedTasksData = null;
  lastTasksFetchTime = 0;
  cachedActivitiesData = null;
  lastActivitiesFetchTime = 0;
}

/**
 * Clear all client cache and active requests (invoked on logout / session switch)
 */
export function clearClientCache(): void {
  memoryCache.clear();
  inFlightRequests.clear();
  cachedStudentData = null;
  lastStudentFetchTime = 0;
  cachedTasksData = null;
  lastTasksFetchTime = 0;
  cachedActivitiesData = null;
  lastActivitiesFetchTime = 0;

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('spr-client-cache-cleared'));
    } catch {
      // Ignore
    }
  }
}

/**
 * Inspect client cache state (for diagnostics and test verification)
 */
export function getClientCacheStats() {
  return {
    cachedKeysCount: memoryCache.size,
    inFlightCount: inFlightRequests.size,
    keys: Array.from(memoryCache.keys()),
  };
}

