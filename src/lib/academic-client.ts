'use client';

import { useState, useEffect } from 'react';

export interface AcademicMasterData {
  schools: any[];
  classes: any[];
  academicYears: any[];
  terms: any[];
  exams: any[];
  subjects: any[];
  levels: any[];
  institutions: any[];
  boards: any[];
  categories: any[];
  programs: any[];
  competitions: any[];
  literaryEvents: any[];
}

let cachedMasterData: AcademicMasterData | null = null;
let inFlightMasterDataPromise: Promise<AcademicMasterData> | null = null;
let lastFetchTimestamp = 0;
const CACHE_MAX_AGE_MS = 3 * 60 * 1000; // 3 minutes fresh cache

export async function getAcademicMasterData(forceRefresh = false): Promise<AcademicMasterData> {
  const now = Date.now();

  // Return in-memory cached data immediately if still fresh and not forcing refresh
  if (!forceRefresh && cachedMasterData && now - lastFetchTimestamp < CACHE_MAX_AGE_MS) {
    return cachedMasterData;
  }

  // Deduplicate concurrent in-flight requests
  if (inFlightMasterDataPromise && !forceRefresh) {
    return inFlightMasterDataPromise;
  }

  inFlightMasterDataPromise = (async () => {
    try {
      const res = await fetch('/api/academic');
      if (!res.ok) throw new Error('Failed to fetch academic masters');
      const data: AcademicMasterData = await res.json();
      cachedMasterData = data;
      lastFetchTimestamp = Date.now();
      return data;
    } finally {
      inFlightMasterDataPromise = null;
    }
  })();

  return inFlightMasterDataPromise;
}

export function invalidateClientAcademicCache() {
  cachedMasterData = null;
  lastFetchTimestamp = 0;
}

export function useAcademicMasters() {
  const [data, setData] = useState<AcademicMasterData | null>(cachedMasterData);
  const [loading, setLoading] = useState<boolean>(!cachedMasterData);

  useEffect(() => {
    let isMounted = true;

    getAcademicMasterData()
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load academic master data:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    ...data,
    academicData: data,
    loading,
    refresh: () => getAcademicMasterData(true).then((res) => setData(res)),
  };
}
