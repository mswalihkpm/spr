/**
 * Centralized Branded Sharing Utilities for SPR Platform
 * Uses the official SPR banner image for all sharing actions,
 * formatting text specifically for WhatsApp (*bold*, _italic_, emojis)
 * and creating an image-connected text message on WhatsApp / Android Share.
 */

import {
  formatDossierShareText,
  formatNewsShareText,
  formatAchievementShareText,
  formatAppShareText,
  formatCollectionReceiptShareText,
  OFFICIAL_BANNER_PATH,
} from './share-constants';

export type ShareTemplateType = 'dossier' | 'news' | 'achievement' | 'app' | 'receipt';

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

export interface CollectionReceiptShareData extends BaseShareData {
  template: 'receipt';
  contributorName: string;
  amount: number | string;
  campaignName: string;
  receiptNumber?: string | null;
  receiptUrl?: string | null;
  studentName?: string | null;
  sprId?: string | null;
}

export type ShareItemParams =
  | StudentDossierShareData
  | NewsShareData
  | AchievementShareData
  | AppPromoShareData
  | CollectionReceiptShareData;

export interface SharePayload {
  template: ShareTemplateType;
  title: string;
  text: string;
  url: string;
  imageUrl: string;
  filename: string;
}

/**
 * Builds the official image URL - always returns the base official banner image
 */
export function buildShareCardUrl(_params?: ShareItemParams): string {
  return OFFICIAL_BANNER_PATH;
}

/**
 * Generate formatted share payload with WhatsApp-optimized text and official base banner
 */
export function generateSharePayload(params: ShareItemParams, origin?: string): SharePayload {
  const currentOrigin =
    origin ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://msoerate.vercel.app');

  const imageUrl = `${currentOrigin}${OFFICIAL_BANNER_PATH}`;
  const filename = 'SPR-Official-Banner.jpg';

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

    return {
      template: 'dossier',
      title: `${studentName} - SPR Student Performance Dossier`,
      text,
      url: dossierUrl,
      imageUrl,
      filename,
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

    return {
      template: 'news',
      title: `${title} | Ma'din School of Excellence`,
      text,
      url: newsUrl,
      imageUrl,
      filename,
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

    return {
      template: 'achievement',
      title: `Excellence Honors: ${params.studentName} - ${params.achievementTitle}`,
      text,
      url: achievementUrl,
      imageUrl,
      filename,
    };
  }

  if (params.template === 'receipt') {
    const text = formatCollectionReceiptShareText({
      contributorName: params.contributorName || 'Supporter',
      amount: params.amount,
      campaignName: params.campaignName || 'Field Collection Drive',
      receiptNumber: params.receiptNumber,
      receiptUrl: params.receiptUrl || params.url,
      studentName: params.studentName,
      sprId: params.sprId,
    });

    return {
      template: 'receipt',
      title: `Contribution Receipt - ₹${params.amount} | Ma'din School of Excellence`,
      text,
      url: params.receiptUrl || params.url || currentOrigin,
      imageUrl,
      filename,
    };
  }

  // General App Promo
  const portalUrl = params.url || currentOrigin;
  const text = formatAppShareText({ webUrl: portalUrl });
  return {
    template: 'app',
    title: 'Students Performance Rate (SPR) - Ma\'din School of Excellence',
    text,
    url: portalUrl,
    imageUrl,
    filename,
  };
}

/**
 * Executes branded sharing:
 * Attaches the official base banner image file with the WhatsApp-formatted message caption.
 * On WhatsApp/Android, this sends the image with the text connected right below it.
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
      // Fetch official base banner image blob
      const res = await fetch(payload.imageUrl, { cache: 'force-cache' });
      if (res.ok) {
        const blob = await res.blob();
        fileToShare = new File([blob], payload.filename, { type: 'image/jpeg' });
      }
    } catch (err) {
      console.warn('Could not fetch banner image blob:', err);
    }

    // Pre-copy text to clipboard so it's always ready in case user needs to paste (e.g. WhatsApp Web)
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(payload.text);
      } catch {
        // Non-blocking clipboard copy
      }
    }

    // Try sharing with File (Level 2 Web Share)
    // CRITICAL FIX: Do NOT pass `title` when sharing files!
    // In Chromium Android (ShareHelper.java):
    // If `title` is passed, Chromium adds `Intent.EXTRA_SUBJECT`.
    // When WhatsApp receives BOTH `EXTRA_SUBJECT` and `EXTRA_STREAM` (the image),
    // it splits them into TWO separate messages: 1 text bubble first, 1 image bubble second!
    // By omitting `title`, Chromium only passes `EXTRA_STREAM` and `EXTRA_TEXT`.
    // WhatsApp Android then maps `EXTRA_TEXT` directly into the image's Caption box ("Add a caption..."),
    // producing a single unified message bubble with image on top and text below!
    if (fileToShare && navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
      try {
        await navigator.share({
          files: [fileToShare],
          text: payload.text,
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

  // Last-resort fallback: Copy WhatsApp text with link to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(payload.text);
      alert('WhatsApp message copied to clipboard!');
      return { success: true, sharedWithFile: false };
    } catch (clipboardErr) {
      console.error('Clipboard copy failed:', clipboardErr);
    }
  }

  return { success: false, sharedWithFile: false };
}
