'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getAcademicMasterData, AcademicMasterData } from '@/lib/academic-client';
import { fetchWithDedupe, invalidateClientCache, seedClientCache } from '@/lib/client-cache';

export interface BootstrapState {
  isBootstrapped: boolean;
  bootstrapProgress: number;
  bootstrapStatus: string;
  academicData: AcademicMasterData | null;
  overviewLeaderboard: any[];
  categories: any[];
  subcategories: any[];
  news: any[];
  displayConfig: any | null;
  isDataReady: boolean;
  refreshBootstrap: (force?: boolean) => Promise<void>;
}

// Module-level global caches to ensure instant 0ms access across route navigations
let globalAcademicCache: AcademicMasterData | null = null;
let globalLeaderboardCache: any[] = [];
let globalCategoriesCache: any[] = [];
let globalSubcategoriesCache: any[] = [];
let globalNewsCache: any[] = [];
let globalDisplayConfigCache: any | null = null;
let globalBootstrapped = false;
let globalBootstrapPromise: Promise<void> | null = null;

const AppBootstrapContext = createContext<BootstrapState>({
  isBootstrapped: false,
  bootstrapProgress: 0,
  bootstrapStatus: 'Initializing SPR...',
  academicData: null,
  overviewLeaderboard: [],
  categories: [],
  subcategories: [],
  news: [],
  displayConfig: null,
  isDataReady: false,
  refreshBootstrap: async () => {},
});

export function AppBootstrapProvider({ children }: { children: React.ReactNode }) {
  const [isBootstrapped, setIsBootstrapped] = useState(globalBootstrapped);
  const [bootstrapProgress, setBootstrapProgress] = useState(globalBootstrapped ? 100 : 0);
  const [bootstrapStatus, setBootstrapStatus] = useState(
    globalBootstrapped ? 'Ready' : 'Initializing SPR Platform...'
  );
  const [academicData, setAcademicData] = useState<AcademicMasterData | null>(globalAcademicCache);
  const [overviewLeaderboard, setOverviewLeaderboard] = useState<any[]>(globalLeaderboardCache);
  const [categories, setCategories] = useState<any[]>(globalCategoriesCache);
  const [subcategories, setSubcategories] = useState<any[]>(globalSubcategoriesCache);
  const [news, setNews] = useState<any[]>(globalNewsCache);
  const [displayConfig, setDisplayConfig] = useState<any | null>(globalDisplayConfigCache);

  const progressRef = useRef(globalBootstrapped ? 100 : 0);

  const updateProgress = (targetPct: number, status?: string) => {
    if (targetPct > progressRef.current) {
      progressRef.current = Math.min(targetPct, 100);
      setBootstrapProgress(progressRef.current);
    }
    if (status) {
      setBootstrapStatus(status);
    }
  };

  const runBootstrap = async (force = false) => {
    if (!force && globalBootstrapped) {
      setIsBootstrapped(true);
      setBootstrapProgress(100);
      setBootstrapStatus('Ready');
      return;
    }

    if (!force && globalBootstrapPromise) {
      await globalBootstrapPromise;
      return;
    }

    globalBootstrapPromise = (async () => {
      if (!globalBootstrapped) {
        setBootstrapStatus('Connecting to SPR services...');
      }

      // Single unified cold-start bootstrap (1 edge-cached invocation instead of 4; 0 invocations when cached in localStorage)
      const bootstrapPromise = fetchWithDedupe<any>('/api/bootstrap', { forceRefresh: force })
        .then((res) => {
          if (res?.academic) {
            globalAcademicCache = res.academic;
            setAcademicData(res.academic);
            seedClientCache('/api/academic', res.academic);
          }
          if (res?.categories && res.categories.length > 0) {
            globalCategoriesCache = res.categories;
            setCategories(res.categories);
          } else if (res?.academic?.categories && res.academic.categories.length > 0) {
            globalCategoriesCache = res.academic.categories;
            setCategories(res.academic.categories);
          }
          if (res?.leaderboard) {
            globalLeaderboardCache = res.leaderboard;
            setOverviewLeaderboard(res.leaderboard);
            seedClientCache('/api/leaderboard', {
              leaderboard: res.leaderboard,
              categories: res.categories || [],
              totalStudents: res.leaderboard.length,
            });
          }
          if (res?.news) {
            globalNewsCache = res.news;
            setNews(res.news);
            seedClientCache('/api/news', { news: res.news });
          }
          if (res?.subcategories) {
            globalSubcategoriesCache = res.subcategories;
            setSubcategories(res.subcategories);
            seedClientCache('/api/subcategories', { subcategories: res.subcategories });
          }
          updateProgress(100, 'SPR data synchronized');
        })
        .catch(async () => {
          // Graceful fallback to individual endpoints if unified bootstrap fails
          const [academicRes, leaderboardRes, newsRes, subRes] = await Promise.allSettled([
            getAcademicMasterData(force),
            fetchWithDedupe<any>('/api/leaderboard', { forceRefresh: force }),
            fetchWithDedupe<any>('/api/news', { forceRefresh: force }),
            fetchWithDedupe<any>('/api/subcategories', { forceRefresh: force }),
          ]);
          if (academicRes.status === 'fulfilled' && academicRes.value) {
            globalAcademicCache = academicRes.value;
            setAcademicData(academicRes.value);
            if (academicRes.value.categories?.length) {
              globalCategoriesCache = academicRes.value.categories;
              setCategories(academicRes.value.categories);
            }
          }
          if (leaderboardRes.status === 'fulfilled' && leaderboardRes.value?.leaderboard) {
            globalLeaderboardCache = leaderboardRes.value.leaderboard;
            setOverviewLeaderboard(leaderboardRes.value.leaderboard);
          }
          if (newsRes.status === 'fulfilled' && newsRes.value?.news) {
            globalNewsCache = newsRes.value.news;
            setNews(newsRes.value.news);
          }
          if (subRes.status === 'fulfilled' && subRes.value?.subcategories) {
            globalSubcategoriesCache = subRes.value.subcategories;
            setSubcategories(subRes.value.subcategories);
          }
        });

      // Safety timeout: Maximum 1200ms before forcing 100% completion so slow network never blocks user
      const safetyTimeout = new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 1200);
      });

      await Promise.race([bootstrapPromise, safetyTimeout]);

      // Complete bootstrap
      globalBootstrapped = true;
      progressRef.current = 100;
      setBootstrapProgress(100);
      setBootstrapStatus('Ready');
      setIsBootstrapped(true);
    })();

    await globalBootstrapPromise;
  };

  useEffect(() => {
    runBootstrap();

    const handleInvalidation = (e: any) => {
      const pattern = e?.detail?.pattern;
      // If relevant master data was invalidated, refresh in the background silently
      if (
        !pattern ||
        pattern.includes('academic') ||
        pattern.includes('categories') ||
        pattern.includes('subcategories') ||
        pattern.includes('leaderboard') ||
        pattern.includes('news')
      ) {
        runBootstrap(true).catch(() => {});
      }
    };

    const handleClear = () => {
      globalAcademicCache = null;
      globalLeaderboardCache = [];
      globalCategoriesCache = [];
      globalSubcategoriesCache = [];
      globalNewsCache = [];
      globalDisplayConfigCache = null;
      globalBootstrapped = false;
      globalBootstrapPromise = null;
    };

    window.addEventListener('spr-client-cache-invalidated', handleInvalidation);
    window.addEventListener('spr-client-cache-cleared', handleClear);

    return () => {
      window.removeEventListener('spr-client-cache-invalidated', handleInvalidation);
      window.removeEventListener('spr-client-cache-cleared', handleClear);
    };
  }, []);

  const value = useMemo<BootstrapState>(
    () => ({
      isBootstrapped,
      bootstrapProgress,
      bootstrapStatus,
      academicData,
      overviewLeaderboard,
      categories: categories.length > 0 ? categories : academicData?.categories || [],
      subcategories,
      news,
      displayConfig,
      isDataReady: isBootstrapped || overviewLeaderboard.length > 0,
      refreshBootstrap: async (force = true) => {
        if (force) {
          invalidateClientCache();
        }
        globalBootstrapPromise = null;
        await runBootstrap(force);
      },
    }),
    [
      isBootstrapped,
      bootstrapProgress,
      bootstrapStatus,
      academicData,
      overviewLeaderboard,
      categories,
      subcategories,
      news,
      displayConfig,
    ]
  );

  return <AppBootstrapContext.Provider value={value}>{children}</AppBootstrapContext.Provider>;
}

export function useAppBootstrap() {
  return useContext(AppBootstrapContext);
}
