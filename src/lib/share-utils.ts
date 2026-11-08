/**
 * Centralized Branded Sharing Utilities for SPR Platform
 * Supports:
 * - Student Dossier (Template 1)
 * - News & Updates (Template 2)
 * - Achievements & Honors (Template 3)
 * - General SPR App Promotion (Template 4)
 *
 * Implements Android Native Share Intent / Web Share API Level 2 (files sharing),
 * with graceful fallback to formatted clipboard copy and modal preview.
 */

import {
  GOOGLE_PLAY_STORE_URL,
  formatDossierShareText,
  formatNewsShareText,
  formatAchievementShareText,
  formatAppShareText,
} from './share-constants';

export type ShareTemplateType = 'dossier' | 'news' | 'achievement' | 'app';

export interface BaseShareData {
  title?: string;
  url?: string;
}

export interface StudentDossierShareData extends BaseShareData {
  template: 'dossier';
  studentId: string;
  studentName?: string | null;
  className?: string | null;
  division?: string | null;
  sprId?: string | null;
  rank?: number | null;
  overallScore?: number | null;
  photoUrl?: string | null;
}

export interface NewsShareData extends BaseShareData {
  template: 'news';
  newsId?: string | null;
  title: string;
  subtitle?: string | null;
  date?: string | null;
  category?: string | null;
  imageUrl?: string | null;
}

export interface AchievementShareData extends BaseShareData {
  template: 'achievement';
  studentId?: string | null;
  studentName: string;
  achievementTitle: string;
  rankText?: string | number | null;
  score?: number | null;
  category?: string | null;
  photoUrl?: string | null;
}

export interface AppPromoShareData extends BaseShareData {
  template: 'app';
  headline?: string;
  subhead?: string;
}

export type ShareItemParams =
  | StudentDossierShareData
  | NewsShareData
  | AchievementShareData
  | AppPromoShareData;

export interface SharePayload {
  template: ShareTemplateType;
  title: string;
  text: string;
  url: string;
  imageUrl: string;
  filename: string;
}

/**
 * Builds the image API route URL for OG/Share card generation
 */
export function buildShareCardUrl(params: ShareItemParams): string {
  const base = '/api/og/share';
  const query = new URLSearchParams();
  query.set('template', params.template);

  if (params.template === 'dossier') {
    if (params.studentId) query.set('id', params.studentId);
    if (params.studentName) query.set('name', params.studentName);
    if (params.className) query.set('class', params.className);
    if (params.division) query.set('division', params.division);
    if (params.sprId) query.set('sprId', params.sprId);
    if (params.rank !== undefined) query.set('rank', String(params.rank));
    if (params.overallScore !== undefined) query.set('score', String(params.overallScore));
    if (params.photoUrl) query.set('photoUrl', params.photoUrl);
  } else if (params.template === 'news') {
    if (params.newsId) query.set('id', params.newsId);
    if (params.title) query.set('title', params.title);
    if (params.subtitle) query.set('subtitle', params.subtitle);
    if (params.date) query.set('date', params.date);
    if (params.category) query.set('category', params.category);
    if (params.imageUrl) query.set('imageUrl', params.imageUrl);
  } else if (params.template === 'achievement') {
    if (params.studentId) query.set('id', params.studentId);
    if (params.studentName) query.set('name', params.studentName);
    if (params.achievementTitle) query.set('title', params.achievementTitle);
    if (params.rankText !== undefined) query.set('rank', String(params.rankText));
    if (params.score !== undefined) query.set('score', String(params.score));
    if (params.category) query.set('category', params.category);
    if (params.photoUrl) query.set('photoUrl', params.photoUrl);
  } else if (params.template === 'app') {
    if (params.headline) query.set('title', params.headline);
    if (params.subhead) query.set('subtitle', params.subhead);
  }

  return `${base}?${query.toString()}`;
}

/**
 * Generate formatted share payload with title, caption text, permalink and image url
 */
export function generateSharePayload(params: ShareItemParams, origin?: string): SharePayload {
  const currentOrigin =
    origin ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://msoerate.vercel.app');

  const imageUrl = `${currentOrigin}${buildShareCardUrl(params)}`;

  if (params.template === 'dossier') {
    const dossierUrl = params.url || `${currentOrigin}/student/${params.studentId}`;
    const studentName = params.studentName || 'Student';
    const text = formatDossierShareText({
      studentName,
      className: params.className || 'Excellence',
      division: params.division,
      sprId: params.sprId,
      rank: params.rank,
      overallScore: params.overallScore,
      dossierUrl,
    });

    const safeSlug = studentName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return {
      template: 'dossier',
      title: `${studentName} - SPR Student Performance Dossier`,
      text,
      url: dossierUrl,
      imageUrl,
      filename: `SPR-Dossier-${safeSlug || 'student'}.png`,
    };
  }

  if (params.template === 'news') {
    const newsUrl = params.url || (params.newsId ? `${currentOrigin}/updates?id=${params.newsId}` : `${currentOrigin}/updates`);
    const title = params.title || 'Excellence Announcement';
    const text = formatNewsShareText({
      title,
      subtitle: params.subtitle,
      date: params.date,
      newsUrl,
    });

    const safeSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30).replace(/(^-|-$)/g, '');
    return {
      template: 'news',
      title: `${title} | Madin School of Excellence`,
      text,
      url: newsUrl,
      imageUrl,
      filename: `SPR-News-${safeSlug || 'update'}.png`,
    };
  }

  if (params.template === 'achievement') {
    const achievementUrl = params.url || `${currentOrigin}/leaderboard`;
    const text = formatAchievementShareText({
      studentName: params.studentName,
      achievementTitle: params.achievementTitle,
      rank: params.rankText,
      score: params.score,
      category: params.category,
      achievementUrl,
    });

    const safeSlug = params.studentName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return {
      template: 'achievement',
      title: `Excellence Honors: ${params.studentName} - ${params.achievementTitle}`,
      text,
      url: achievementUrl,
      imageUrl,
      filename: `SPR-Honor-${safeSlug || 'achievement'}.png`,
    };
  }

  // General App Promo
  const portalUrl = params.url || currentOrigin;
  const text = formatAppShareText({ webUrl: portalUrl });
  return {
    template: 'app',
    title: 'Students Performance Rate (SPR) - Madin School of Excellence',
    text,
    url: portalUrl,
    imageUrl,
    filename: 'SPR-Platform-Madin-Excellence.png',
  };
}

/**
 * Executes branded sharing:
 * 1. Tries Web Share API Level 2 with attached generated image file (Android native share)
 * 2. If unsupported or rejected, falls back to text-only Web Share
 * 3. If Web Share is not available (desktop browsers), triggers fallback modal
 */
export async function executeBrandedShare(
  params: ShareItemParams,
  options?: {
    onFallbackModal?: (payload: SharePayload) => void;
    forceModal?: boolean;
  }
): Promise<{ success: boolean; sharedWithFile: boolean; cancelled?: boolean }> {
  const payload = generateSharePayload(params);

  // If caller specifically requested modal preview
  if (options?.forceModal) {
    if (options.onFallbackModal) {
      options.onFallbackModal(payload);
      return { success: true, sharedWithFile: false };
    }
  }

  // Check for custom Android JavaScript bridge if present
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (win.SPRNative?.share) {
      try {
        win.SPRNative.share(payload.title, payload.text, payload.url, payload.imageUrl);
        return { success: true, sharedWithFile: true };
      } catch (e) {
        console.warn('SPRNative bridge failed, falling back to Web Share API', e);
      }
    }
  }

  // Web Share API Support Check
  if (typeof navigator !== 'undefined' && navigator.share) {
    let fileToShare: File | null = null;

    try {
      // Attempt to fetch generated image blob
      const res = await fetch(payload.imageUrl, { cache: 'force-cache' });
      if (res.ok) {
        const blob = await res.blob();
        fileToShare = new File([blob], payload.filename, { type: 'image/png' });
      }
    } catch (err) {
      console.warn('Could not fetch share card image blob:', err);
    }

    // Try sharing with File (Level 2 Web Share)
    if (fileToShare && navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
      try {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          files: [fileToShare],
        });
        return { success: true, sharedWithFile: true };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { success: false, sharedWithFile: false, cancelled: true };
        }
        console.warn('Share with file failed, attempting text-only share:', err);
      }
    }

    // Fallback: Web Share without file
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return { success: true, sharedWithFile: false };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, sharedWithFile: false, cancelled: true };
      }
      console.warn('Standard Web Share failed:', err);
    }
  }

  // Desktop or unsupported browser fallback -> Open modal
  if (options?.onFallbackModal) {
    options.onFallbackModal(payload);
    return { success: true, sharedWithFile: false };
  }

  // Last-resort fallback: Copy text with link to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(payload.text);
      alert('Share message and Google Play link copied to clipboard!');
      return { success: true, sharedWithFile: false };
    } catch (clipboardErr) {
      console.error('Clipboard copy failed:', clipboardErr);
    }
  }

  return { success: false, sharedWithFile: false };
}

