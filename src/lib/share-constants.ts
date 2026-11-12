/**
 * Unified Share Constants & Message Formatters for SPR Platform
 * Clean WhatsApp formatting (*bold*, _italic_) with reduced symbols/emojis
 * Official Android Package: in.madin.spr
 */

export const GOOGLE_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=in.madin.spr';
export const ANDROID_PACKAGE_NAME = 'in.madin.spr';
export const INSTITUTION_NAME = "Ma'din School of Excellence";
export const APP_TITLE = 'Students Performance Rate (SPR)';
export const OFFICIAL_BANNER_PATH = '/branding/spr-official-banner.jpg';

export interface DossierShareData {
  studentName: string;
  className: string;
  division?: string | null;
  sprId?: string | null;
  rank?: number | null;
  overallScore?: number | null;
  dossierUrl: string;
}

export interface NewsShareData {
  title: string;
  date?: string | null;
  subtitle?: string | null;
  newsUrl: string;
}

export interface AchievementShareData {
  studentName: string;
  achievementTitle: string;
  rank?: number | string | null;
  score?: number | null;
  category?: string | null;
  achievementUrl: string;
}

export interface AppShareData {
  webUrl?: string;
}

export interface CollectionReceiptShareData {
  contributorName: string;
  amount: number | string;
  campaignName: string;
  receiptNumber?: string | null;
  receiptUrl?: string | null;
  studentName?: string | null;
  sprId?: string | null;
}

/**
 * Format Official Contribution Receipt Sharing Text
 * Matches the official Ma'din Academy WhatsApp Business receipt format
 */
export function formatCollectionReceiptShareText(data: CollectionReceiptShareData): string {
  const parts = [
    `*Dear ${data.contributorName.trim()},*`,
    '',
    `We have successfully received your contribution of *₹${data.amount}* towards *${data.campaignName.trim()}*.`,
    '',
    '📄 _Your receipt details are attached below for your reference._',
  ];

  if (data.receiptNumber) {
    parts.push(`*Receipt No:* ${data.receiptNumber}`);
  }

  if (data.studentName && data.studentName.trim() !== data.contributorName.trim()) {
    parts.push(`*Student Beneficiary:* ${data.studentName.trim()}${data.sprId ? ` (${data.sprId})` : ''}`);
  }

  parts.push(
    '',
    'Thank you for your support.',
    '',
    "*Ma'din School of Excellence*",
    '*Students Performance Rate (SPR)*'
  );

  if (data.receiptUrl) {
    parts.push('', '*View Receipt:*', data.receiptUrl);
  }

  parts.push(
    '',
    '*Get SPR on Google Play:*',
    GOOGLE_PLAY_STORE_URL
  );

  return parts.join('\n');
}

/**
 * Format Student Dossier Sharing Text (Clean WhatsApp Formatting, No Emoji Clutter)
 */
export function formatDossierShareText(data: DossierShareData): string {
  const parts = [
    "*MA'DIN SCHOOL OF EXCELLENCE*",
    '*Students Performance Rate (SPR)*',
    '',
    '*STUDENT PERFORMANCE DOSSIER*',
    '',
    `*Student:* ${data.studentName.trim()}`,
    `*Class:* ${data.className}${data.division ? ` (Div ${data.division})` : ''}`,
  ];

  if (data.sprId) {
    parts.push(`*SPR ID:* ${data.sprId}`);
  }

  if (data.rank !== undefined && data.rank !== null) {
    parts.push(`*Institutional Rank:* #${data.rank}`);
  }

  if (data.overallScore !== undefined && data.overallScore !== null) {
    parts.push(`*Overall SPR Score:* ${data.overallScore.toFixed(2)} pts`);
  }

  parts.push(
    '',
    '_Track academic progress, achievements, rankings and school activities._',
    '',
    '*View Official Dossier:*',
    data.dossierUrl,
    '',
    '*Get SPR on Google Play:*',
    GOOGLE_PLAY_STORE_URL
  );

  return parts.join('\n');
}

/**
 * Format News & Updates Sharing Text (Clean WhatsApp Formatting, No Emoji Clutter)
 */
export function formatNewsShareText(data: NewsShareData): string {
  const parts = [
    "*MA'DIN SCHOOL OF EXCELLENCE*",
    '*Students Performance Rate (SPR)*',
    '',
    '*OFFICIAL ANNOUNCEMENT*',
    '',
    `*${data.title.trim()}*`,
  ];

  if (data.subtitle && data.subtitle.trim()) {
    parts.push(`_${data.subtitle.trim()}_`);
  }

  if (data.date && data.date.trim()) {
    parts.push(`*Published:* ${data.date.trim()}`);
  }

  parts.push(
    '',
    '_Stay updated with the latest school announcements, activities and events._',
    '',
    '*Read Full Circular:*',
    data.newsUrl,
    '',
    '*Get SPR on Google Play:*',
    GOOGLE_PLAY_STORE_URL
  );

  return parts.join('\n');
}

/**
 * Format Student Achievement Sharing Text (Clean WhatsApp Formatting)
 */
export function formatAchievementShareText(data: AchievementShareData): string {
  const parts = [
    "*MA'DIN SCHOOL OF EXCELLENCE*",
    '*Students Performance Rate (SPR)*',
    '',
    '*EXCELLENCE HONORS & ACHIEVEMENTS*',
    '',
    `*Student:* ${data.studentName.trim()}`,
    `*Honor:* ${data.achievementTitle.trim()}`,
  ];

  if (data.category && data.category.trim()) {
    parts.push(`*Category:* ${data.category.trim()}`);
  }

  if (data.rank !== undefined && data.rank !== null) {
    parts.push(`*Standing:* ${typeof data.rank === 'number' ? `Rank #${data.rank}` : data.rank}`);
  }

  if (data.score !== undefined && data.score !== null) {
    parts.push(`*Score:* ${data.score.toFixed(2)} SPR Points`);
  }

  parts.push(
    '',
    '_Track performance rate, competitive milestones and school honors._',
    '',
    '*View Standings:*',
    data.achievementUrl,
    '',
    '*Get SPR on Google Play:*',
    GOOGLE_PLAY_STORE_URL
  );

  return parts.join('\n');
}

/**
 * Format General SPR Application Promotion Text
 * User requirement: "IF WE CLICK ON SHARE APP ,THERE ONLY SHARE THE APPS PLAYSTORE LINK ONLY WITH THIS BASE BANNER IMAGE"
 */
export function formatAppShareText(_data?: AppShareData): string {
  return [
    "*MA'DIN SCHOOL OF EXCELLENCE*",
    '*Students Performance Rate (SPR)*',
    '',
    '*Download Official Android App on Google Play:*',
    GOOGLE_PLAY_STORE_URL,
  ].join('\n');
}
