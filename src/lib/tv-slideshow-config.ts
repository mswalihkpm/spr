import { TvSlideshowSettings, TvSlideImage } from '@/types';

export const DEFAULT_TV_SLIDESHOW_SETTINGS: TvSlideshowSettings = {
  leaderboardSlideDuration: 7,
  imageSlideDuration: 8,
  notificationDuration: 7,
  autoRefreshInterval: 2,
  mode: 'BOTH',
  interleaveMode: 'EVERY_N_SLIDES',
  interleaveFrequency: 1,
  studentsPerSlide: 14,
  columnLayout: 'TWO_COLUMNS',
  theme: 'MIDNIGHT',
  transitionEffect: 'SLIDE',
  showProgressBar: true,
  showSlideCounter: true,
  showClock: true,
  showNotificationsTicker: true,
  autoPlay: true,
};

export function parseTvSlideshowSettings(raw?: string | null): TvSlideshowSettings {
  if (!raw) return DEFAULT_TV_SLIDESHOW_SETTINGS;
  try {
    const parsed = JSON.parse(raw);
    return {
      leaderboardSlideDuration: Math.max(3, Math.min(120, Number(parsed.leaderboardSlideDuration) || 7)),
      imageSlideDuration: Math.max(3, Math.min(120, Number(parsed.imageSlideDuration) || 8)),
      notificationDuration: Math.max(3, Math.min(60, Number(parsed.notificationDuration) || 7)),
      autoRefreshInterval: Math.max(1, Math.min(60, Number(parsed.autoRefreshInterval) || 2)),
      mode: ['BOTH', 'LEADERBOARD_ONLY', 'IMAGES_ONLY'].includes(parsed.mode) ? parsed.mode : 'BOTH',
      interleaveMode: ['EVERY_N_SLIDES', 'AFTER_ALL', 'BEFORE_ALL'].includes(parsed.interleaveMode) ? parsed.interleaveMode : 'EVERY_N_SLIDES',
      interleaveFrequency: Math.max(1, Math.min(10, Number(parsed.interleaveFrequency) || 1)),
      studentsPerSlide: [7, 10, 12, 14, 16, 20].includes(Number(parsed.studentsPerSlide)) ? Number(parsed.studentsPerSlide) : 14,
      columnLayout: parsed.columnLayout === 'SINGLE_COLUMN' ? 'SINGLE_COLUMN' : 'TWO_COLUMNS',
      theme: ['MIDNIGHT', 'COSMIC', 'GOLD', 'EMERALD'].includes(parsed.theme) ? parsed.theme : 'MIDNIGHT',
      transitionEffect: ['SLIDE', 'FADE', 'ZOOM', 'FLIP'].includes(parsed.transitionEffect) ? parsed.transitionEffect : 'SLIDE',
      showProgressBar: parsed.showProgressBar !== false,
      showSlideCounter: parsed.showSlideCounter !== false,
      showClock: parsed.showClock !== false,
      showNotificationsTicker: parsed.showNotificationsTicker !== false,
      autoPlay: parsed.autoPlay !== false,
      defaultCategoryId: parsed.defaultCategoryId || undefined,
      defaultClassId: parsed.defaultClassId || undefined,
    };
  } catch (e) {
    return DEFAULT_TV_SLIDESHOW_SETTINGS;
  }
}

export function parseTvSlideImages(raw?: string | null): TvSlideImage[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((img) => img && typeof img.imageUrl === 'string' && img.imageUrl.trim().length > 0)
      .map((img, idx) => ({
        id: String(img.id || `slide-img-${idx}-${Date.now()}`),
        imageUrl: String(img.imageUrl).trim(),
        title: img.title ? String(img.title).trim() : undefined,
        caption: img.caption ? String(img.caption).trim() : undefined,
        duration: img.duration ? Math.max(3, Math.min(120, Number(img.duration))) : undefined,
        active: img.active !== false,
        order: typeof img.order === 'number' ? img.order : idx,
        createdAt: img.createdAt || new Date().toISOString(),
      }))
      .sort((a, b) => a.order - b.order);
  } catch (e) {
    return [];
  }
}
