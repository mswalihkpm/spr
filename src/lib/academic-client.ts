'use client';

import { useState, useEffect } from 'react';
import { fetchWithDedupe, invalidateClientCache } from './client-cache';

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

export async function getAcademicMasterData(forceRefresh = false): Promise<AcademicMasterData> {
  const data = await fetchWithDedupe<AcademicMasterData>('/api/academic', { forceRefresh });
  cachedMasterData = data;
  return data;
}

export function invalidateClientAcademicCache() {
  cachedMasterData = null;
  invalidateClientCache('/api/academic');
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
