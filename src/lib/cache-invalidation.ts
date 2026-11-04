import { revalidatePath, revalidateTag } from 'next/cache';
import { invalidateEngineCache } from '@/lib/spr-engine';

/**
 * Centralized cache invalidation helpers for Vercel CDN Edge Cache
 * and in-memory server state.
 */

function safeRevalidate(pathOrTag: string, type?: 'page' | 'layout') {
  try {
    if (type) {
      revalidatePath(pathOrTag, type);
    } else {
      revalidatePath(pathOrTag);
    }
  } catch (err) {
    // Graceful fallback if called outside active Next.js request lifecycle
  }
}

export function triggerCategoriesRevalidation() {
  invalidateEngineCache();
  safeRevalidate('/api/categories');
  safeRevalidate('/api/subcategories');
  safeRevalidate('/api/leaderboard');
  safeRevalidate('/api/display');
  safeRevalidate('/categories');
  safeRevalidate('/leaderboard');
}

export function triggerSubcategoriesRevalidation() {
  invalidateEngineCache();
  safeRevalidate('/api/subcategories');
  safeRevalidate('/api/categories');
  safeRevalidate('/api/leaderboard');
  safeRevalidate('/subcategories');
  safeRevalidate('/leaderboard');
}

export function triggerWeightsRevalidation() {
  invalidateEngineCache();
  safeRevalidate('/api/weights');
  safeRevalidate('/api/categories');
  safeRevalidate('/api/leaderboard');
  safeRevalidate('/api/display');
  safeRevalidate('/weights');
  safeRevalidate('/leaderboard');
}

export function triggerNewsRevalidation() {
  safeRevalidate('/api/news');
  safeRevalidate('/updates');
  safeRevalidate('/');
}

export function triggerSettingsRevalidation() {
  safeRevalidate('/api/settings');
  safeRevalidate('/api/display');
  safeRevalidate('/settings');
  safeRevalidate('/display');
}

export function triggerAcademicRevalidation() {
  invalidateEngineCache();
  safeRevalidate('/api/academic');
  safeRevalidate('/api/exams');
  safeRevalidate('/api/terms');
  safeRevalidate('/api/weights');
  safeRevalidate('/api/leaderboard');
  safeRevalidate('/api/display');
  safeRevalidate('/leaderboard');
}

export function triggerLeaderboardRevalidation() {
  invalidateEngineCache();
  safeRevalidate('/api/leaderboard');
  safeRevalidate('/api/display');
  safeRevalidate('/leaderboard');
  safeRevalidate('/display');
  safeRevalidate('/');
}
