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
  '/api/categories': 24 * 60 * 60 * 1000,      // 24 hours
  '/api/subcategories': 24 * 60 * 60 * 1000,   // 24 hours
  '/api/settings': 24 * 60 * 60 * 1000,        // 24 hours
  '/api/academic': 24 * 60 * 60 * 1000,        // 24 hours
  '/api/news': 60 * 60 * 1000,                 // 1 hour
  '/api/leaderboard': 5 * 60 * 1000,           // 5 minutes
  '/api/display': 30 * 60 * 1000,              // 30 minutes
  '/api/public/student': 2 * 60 * 1000,        // 2 minutes (Public Scorecards)
};

// Endpoints strictly permitted for shared client caching (all other endpoints have TTL = 0)
const PUBLIC_CACHEABLE_PREFIXES = [
  '/api/categories',
  '/api/subcategories',
  '/api/settings',
  '/api/academic',
  '/api/news',
  '/api/leaderboard',
  '/api/display',
  '/api/public/student',
];

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

/**
 * Deduplicated client fetch with in-memory TTL caching
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

  // 1. Return fresh cached data if available and not forcing refresh
  if (!forceRefresh && cacheable) {
    const cached = memoryCache.get(key);
    if (cached && now - cached.timestamp < cached.ttl) {
      return cached.data as T;
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

      // Store in memory cache if cacheable
      if (cacheable) {
        memoryCache.set(key, {
          data,
          timestamp: Date.now(),
          ttl: configuredTTL,
        });
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

/**
 * Clear all client cache and active requests (invoked on logout / session switch)
 */
export function clearClientCache(): void {
  memoryCache.clear();
  inFlightRequests.clear();

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

