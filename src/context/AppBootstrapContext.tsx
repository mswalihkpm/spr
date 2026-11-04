'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getAcademicMasterData, AcademicMasterData } from '@/lib/academic-client';
import { fetchWithDedupe, invalidateClientCache } from '@/lib/client-cache';

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

      const weights = {
        academic: 40,
        leaderboard: 40,
        news: 10,
        subcategories: 10,
      };

      const completed = {
        academic: 0,
        leaderboard: 0,
        news: 0,
        subcategories: 0,
      };

      const calculateTotalProgress = () => {
        return completed.academic + completed.leaderboard + completed.news + completed.subcategories;
      };

      // 1. Parallel fetch: Academic Master Data (categories, classes, schools, etc.)
      const academicPromise = getAcademicMasterData(force)
        .then((data) => {
          if (data) {
            globalAcademicCache = data;
            setAcademicData(data);
            if (data.categories && data.categories.length > 0) {
              globalCategoriesCache = data.categories;
              setCategories(data.categories);
            }
          }
          completed.academic = weights.academic;
          updateProgress(calculateTotalProgress(), 'Academic data synchronized');
        })
        .catch(() => {
          completed.academic = weights.academic;
          updateProgress(calculateTotalProgress());
        });

      // 2. Parallel fetch: Overall Leaderboard Standings
      const leaderboardPromise = fetchWithDedupe<any>('/api/leaderboard', { forceRefresh: force })
        .then((data) => {
          if (data?.leaderboard) {
            globalLeaderboardCache = data.leaderboard;
            setOverviewLeaderboard(data.leaderboard);
            if (data.categories && globalCategoriesCache.length === 0) {
              globalCategoriesCache = data.categories;
              setCategories(data.categories);
            }
          }
          completed.leaderboard = weights.leaderboard;
          updateProgress(calculateTotalProgress(), 'Leaderboard standings ready');
        })
        .catch(() => {
          completed.leaderboard = weights.leaderboard;
          updateProgress(calculateTotalProgress());
        });

      // 3. Parallel fetch: News / Broadcasts
      const newsPromise = fetchWithDedupe<any>('/api/news', { forceRefresh: force })
        .then((data) => {
          if (data?.news) {
            globalNewsCache = data.news;
            setNews(data.news);
          }
          completed.news = weights.news;
          updateProgress(calculateTotalProgress(), 'Announcements synchronized');
        })
        .catch(() => {
          completed.news = weights.news;
          updateProgress(calculateTotalProgress());
        });

      // 4. Parallel fetch: Subcategories
      const subcategoriesPromise = fetchWithDedupe<any>('/api/subcategories', { forceRefresh: force })
        .then((data) => {
          if (data?.subcategories) {
            globalSubcategoriesCache = data.subcategories;
            setSubcategories(data.subcategories);
          }
          completed.subcategories = weights.subcategories;
          updateProgress(calculateTotalProgress(), 'Subcategories loaded');
        })
        .catch(() => {
          completed.subcategories = weights.subcategories;
          updateProgress(calculateTotalProgress());
        });

      // Safety timeout: Maximum 1200ms before forcing 100% completion so slow network never blocks user
      const safetyTimeout = new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 1200);
      });

      // Wait for all critical parallel requests to complete or timeout
      await Promise.race([
        Promise.allSettled([
          academicPromise,
          leaderboardPromise,
          newsPromise,
          subcategoriesPromise,
        ]),
        safetyTimeout,
      ]);

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
