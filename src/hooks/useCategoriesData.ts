'use client';

/**
 * useCategoriesData Hook
 * 
 * Objectives:
 * 1. Primary: Direct Supabase Data API (PostgREST) access using anon key.
 * 2. Fallback: Automatic zero-downtime failover to Vercel route `/api/categories`.
 * 3. In-flight request deduplication across multiple component mounts.
 * 4. Client-side memory caching with 24-hour TTL.
 * 5. Full parity with /api/categories output format (including logo sanitization).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { fetchWithDedupe, invalidateClientCache } from '@/lib/client-cache';
import { sanitizeSubcategoryLogo } from '@/lib/logo-utils';

export interface SubcategoryItem {
  id: string;
  categoryId: string;
  name: string;
  code: string;
  logoUrl?: string | null;
  hasLevels: boolean;
  levelGroup?: string | null;
  allowedLevelIds?: string | null;
  hasMaxScore: boolean;
  maxScore: number;
  weight: number;
  displayOrder: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: { performanceRecords: number };
}

export interface CategoryItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  isSystem: boolean;
  active: boolean;
  displayOrder: number;
  defaultWeight: number;
  includeInSPR: boolean;
  createdAt?: string;
  updatedAt?: string;
  subcategories: SubcategoryItem[];
  categoryWeights?: any[];
  _count?: {
    subcategories: number;
    performanceRecords: number;
    subjects: number;
    exams: number;
  };
}

export interface UseCategoriesDataResult {
  categories: CategoryItem[];
  loading: boolean;
  error: string | null;
  source: 'supabase' | 'vercel' | 'cache';
  refetch: (forceRefresh?: boolean) => Promise<void>;
}

// In-flight promise tracker for Supabase direct queries
let supabaseInFlightPromise: Promise<CategoryItem[]> | null = null;
let supabaseMemoryCache: { timestamp: number; data: CategoryItem[] } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function clearCategoriesMemoryCache() {
  supabaseMemoryCache = null;
  supabaseInFlightPromise = null;
  invalidateClientCache('/api/categories');
}

/**
 * Fetch categories directly from Supabase PostgREST
 */
async function fetchFromSupabaseDirect(): Promise<CategoryItem[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error('Supabase browser client is not configured (missing URL or anon key).');
  }

  const { data, error } = await supabase
    .from('Category')
    .select(`
      id,
      code,
      name,
      description,
      icon,
      isSystem,
      active,
      displayOrder,
      defaultWeight,
      includeInSPR,
      createdAt,
      updatedAt,
      subcategories:Subcategory (
        id,
        categoryId,
        name,
        code,
        logoUrl,
        hasLevels,
        levelGroup,
        allowedLevelIds,
        hasMaxScore,
        maxScore,
        weight,
        displayOrder,
        active,
        createdAt,
        updatedAt
      )
    `)
    .eq('active', true)
    .order('displayOrder', { ascending: true });

  if (error) {
    throw new Error(`Supabase PostgREST error: ${error.message} (code: ${error.code})`);
  }

  if (!data || !Array.isArray(data)) {
    throw new Error('Supabase PostgREST returned empty or non-array response.');
  }

  // Transform and sanitize results to ensure exact parity with /api/categories
  const sanitizedCategories: CategoryItem[] = data.map((cat: any) => {
    const rawSubs: any[] = cat.subcategories || [];
    // Filter active subcategories and sort by displayOrder, then createdAt
    const sortedSubs = rawSubs
      .filter((s: any) => s.active !== false)
      .sort((a: any, b: any) => {
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      })
      .map((sub: any) => ({
        ...sub,
        logoUrl: sanitizeSubcategoryLogo(sub.code, sub.logoUrl),
        _count: sub._count || { performanceRecords: 0 },
      }));

    return {
      ...cat,
      subcategories: sortedSubs,
      categoryWeights: cat.categoryWeights || [],
      _count: {
        subcategories: sortedSubs.length,
        performanceRecords: 0,
        subjects: 0,
        exams: 0,
      },
    };
  });

  return sanitizedCategories;
}

/**
 * Deduplicated direct fetch with in-memory caching
 */
async function getCategoriesDirect(forceRefresh = false): Promise<CategoryItem[]> {
  const now = Date.now();

  // 1. Return from memory cache if fresh
  if (!forceRefresh && supabaseMemoryCache && now - supabaseMemoryCache.timestamp < CACHE_TTL_MS) {
    return supabaseMemoryCache.data;
  }

  // 2. Reuse in-flight query if already pending
  if (!forceRefresh && supabaseInFlightPromise) {
    return supabaseInFlightPromise;
  }

  // 3. Initiate query
  supabaseInFlightPromise = (async () => {
    try {
      const result = await fetchFromSupabaseDirect();
      supabaseMemoryCache = { timestamp: Date.now(), data: result };
      return result;
    } finally {
      supabaseInFlightPromise = null;
    }
  })();

  return supabaseInFlightPromise;
}

/**
 * Fallback fetch through existing Vercel API route
 */
async function fetchFromVercelFallback(forceRefresh = false): Promise<CategoryItem[]> {
  const json = await fetchWithDedupe<any>('/api/categories', {
    forceRefresh,
  });
  return json.categories || [];
}

export function useCategoriesData(options?: { forceRefresh?: boolean }) {
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    if (supabaseMemoryCache && Date.now() - supabaseMemoryCache.timestamp < CACHE_TTL_MS) {
      return supabaseMemoryCache.data;
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(categories.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'supabase' | 'vercel' | 'cache'>(
    categories.length > 0 ? 'cache' : 'supabase'
  );

  const isMountedRef = useRef(true);

  const loadData = useCallback(async (force = false) => {
    if (isMountedRef.current && categories.length === 0) {
      setLoading(true);
    }
    setError(null);

    // Step 1: Try Direct Supabase Data API
    try {
      const data = await getCategoriesDirect(force);
      if (isMountedRef.current) {
        setCategories(data);
        setSource(force ? 'supabase' : supabaseMemoryCache ? 'cache' : 'supabase');
        setLoading(false);
      }
      return;
    } catch (supabaseError: any) {
      console.warn(
        '[useCategoriesData] Direct Supabase access failed; falling back to Vercel /api/categories:',
        supabaseError?.message || supabaseError
      );
    }

    // Step 2: Automatic fallback to existing Vercel /api/categories
    try {
      const fallbackData = await fetchFromVercelFallback(force);
      if (isMountedRef.current) {
        setCategories(fallbackData);
        setSource('vercel');
        setLoading(false);
      }
    } catch (vercelError: any) {
      console.error('[useCategoriesData] Both Supabase and Vercel fetch failed:', vercelError);
      if (isMountedRef.current) {
        setError(vercelError?.message || 'Failed to load categories.');
        setLoading(false);
      }
    }
  }, [categories.length]);

  useEffect(() => {
    isMountedRef.current = true;
    loadData(options?.forceRefresh);
    return () => {
      isMountedRef.current = false;
    };
  }, [loadData, options?.forceRefresh]);

  const refetch = useCallback(
    async (forceRefresh = true) => {
      clearCategoriesMemoryCache();
      await loadData(forceRefresh);
    },
    [loadData]
  );

  return { categories, loading, error, source, refetch };
}
