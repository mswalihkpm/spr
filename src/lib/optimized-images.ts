/**
 * Maps verified static UI raster assets in /public to non-destructive WebP siblings
 * in /public/optimized/*.webp while preserving every original path as an automatic fallback.
 */

export const OPTIMIZED_IMAGE_MAP: Readonly<Record<string, string>> = {
  '/field-collection-logo.png': '/optimized/field-collection-logo.webp',
  '/kuthbkhana-logo.png': '/optimized/kuthbkhana-logo.webp',
  '/kalotsav.png': '/optimized/kalotsav.webp',
  '/logo.png': '/optimized/logo.webp',
  '/hero-bg.jpg': '/optimized/hero-bg.webp',
  '/school-studies-logo.png': '/optimized/school-studies-logo.webp',
  '/m-lit.png': '/optimized/m-lit.webp',
  '/library-logo.png': '/optimized/library-logo.webp',
  '/jamia-mahrajan.png': '/optimized/jamia-mahrajan.webp',
  '/sahityotsav.png': '/optimized/sahityotsav.webp',
  '/creative-hub-logo.png': '/optimized/creative-hub-logo.webp',
  '/madin-academy-dark.png': '/optimized/madin-academy-dark.webp',
  '/madin-academy.png': '/optimized/madin-academy.webp',
  '/literary-logo.png': '/optimized/literary-logo.webp',
  '/jamiathul-hind.png': '/optimized/jamiathul-hind.webp',
  '/jamiathul-hind-calligraphy.png': '/optimized/jamiathul-hind-calligraphy.webp',
  '/qualification-logo.png': '/optimized/qualification-logo.webp',
  '/programs-logo.png': '/optimized/programs-logo.webp',
};

export function getOptimizedImageSrc(src: string | null | undefined): string {
  if (!src || typeof src !== 'string') return '';
  const trimmed = src.trim();
  const basePath = trimmed.split('?')[0].split('#')[0];
  return OPTIMIZED_IMAGE_MAP[basePath] || trimmed;
}

export function getOriginalImageFallback(src: string | null | undefined): string {
  if (!src || typeof src !== 'string') return '';
  return src.trim();
}
