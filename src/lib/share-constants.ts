/**
 * Unified Share Constants & Message Formatters for SPR Platform
 * Official Android Package: in.madin.spr
 */

export const GOOGLE_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=in.madin.spr';
export const ANDROID_PACKAGE_NAME = 'in.madin.spr';
export const INSTITUTION_NAME = 'Madin School of Excellence';
export const APP_TITLE = 'Students Performance Rate (SPR)';

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

/**
 * Format Student Dossier Sharing Text
 */
export function formatDossierShareText(data: DossierShareData): string {
  const parts = [
    'EXCELLENCE | SPR PLATFORM',
    '',
    'STUDENT PERFORMANCE DOSSIER',
    '',
    `Student: ${data.studentName}`,
    `Class: ${data.className}${data.division ? ` (Div ${data.division})` : ''}`,
  ];

  if (data.rank && data.overallScore) {
    parts.push(`SPR Rank: #${data.rank} • Score: ${data.overallScore.toFixed(2)} pts`);
  }

  parts.push(
    '',
    'Explore this student\'s academic progress, achievements, rankings and school activities.',
    '',
    `View Dossier: ${data.dossierUrl}`,
    '',
    `Get SPR on Google Play: ${GOOGLE_PLAY_STORE_URL}`
  );

  return parts.join('\n');
}

/**
 * Format News & Updates Sharing Text
 */
export function formatNewsShareText(data: NewsShareData): string {
  const parts = [
    'EXCELLENCE | SPR PLATFORM',
    '',
    'NEWS & UPDATES',
    '',
    data.title,
  ];

  if (data.subtitle) {
    parts.push(data.subtitle);
  }

  if (data.date) {
    parts.push(`Published: ${data.date}`);
  }

  parts.push(
    '',
    'Stay updated with the latest school announcements, activities and events.',
    '',
    `Read Full Update: ${data.newsUrl}`,
    '',
    `Get SPR on Google Play: ${GOOGLE_PLAY_STORE_URL}`
  );

  return parts.join('\n');
}

/**
 * Format Student Achievement Sharing Text
 */
export function formatAchievementShareText(data: AchievementShareData): string {
  const parts = [
    'EXCELLENCE | SPR PLATFORM',
    '',
    'EXCELLENCE HONORS & ACHIEVEMENTS',
    '',
    `Student: ${data.studentName}`,
    `Honor: ${data.achievementTitle}`,
  ];

  if (data.category) {
    parts.push(`Category: ${data.category}`);
  }

  if (data.rank) {
    parts.push(`Standing: ${typeof data.rank === 'number' ? `Rank #${data.rank}` : data.rank}`);
  }

  if (data.score) {
    parts.push(`Score: ${data.score.toFixed(2)} SPR Points`);
  }

  parts.push(
    '',
    'Track performance rate, competitive milestones and school honors.',
    '',
    `View Standings: ${data.achievementUrl}`,
    '',
    `Get SPR on Google Play: ${GOOGLE_PLAY_STORE_URL}`
  );

  return parts.join('\n');
}

/**
 * Format General SPR Application Promotion Text
 */
export function formatAppShareText(data?: AppShareData): string {
  const portalUrl = data?.webUrl || 'https://msoerate.vercel.app';
  return [
    'EXCELLENCE | SPR PLATFORM',
    '',
    'STUDENTS PERFORMANCE RATE (SPR)',
    '',
    'Track academic progress, achievements, rankings and school activities in one place.',
    '',
    `Official Web Portal: ${portalUrl}`,
    '',
    `Download SPR on Google Play: ${GOOGLE_PLAY_STORE_URL}`,
  ].join('\n');
}

