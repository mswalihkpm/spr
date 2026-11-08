/**
 * Utility functions for handling and sanitizing category and subcategory logos.
 * Prevents massive Base64 data URIs from bloating API responses and consuming
 * Fast Origin Transfer bandwidth.
 */

export function getSubcategoryFallbackLogo(code?: string): string | null {
  const c = (code || '').toUpperCase();
  if (c === 'KUTHBKHANA' || c.includes('KUTHB') || c.includes('KITHAB')) return '/logos/kuthbkhana.webp';
  if (c === 'LIBRARY_IMTHIYAAZ' || c === 'IMTHIYAAZ_LIBRARY' || c === 'LIBRARY' || c.includes('READ') || c.includes('LIBRA')) return '/library-logo.png';
  if (c === 'MADIN_ACADEMY' || c.includes('MADIN')) return '/madin-academy-dark.png';
  if (c === 'JAMIATHUL_HIND' || c.includes('JAMIATHUL')) return '/jamiathul-hind.png';
  if (c === 'SAHITYOTSAV' || c.includes('SAHITY')) return '/sahityotsav.png';
  if (c === 'KALOTSAV' || c.includes('KALOT')) return '/kalotsav.png';
  if (c === 'M_LIT_FEST' || c === 'M_LIT' || c.includes('M_LIT') || c.includes('MLIT')) return '/m-lit.png';
  if (c === 'JAMIA_MAHARJAN' || c.includes('MAHARJAN')) return '/jamia-mahrajan.png';
  if (c.includes('SHASTRA')) return '/logos/shastramela.webp';
  if (c.includes('MEEM')) return '/logos/meem.webp';
  if (c.includes('ABUBAKR')) return '/madin-academy-dark.png';
  if (c.includes('GENERAL_ASSESSMENT') || c.includes('THAHADI')) return 'https://arabreadingchallenge.com/assets/frontend/dist/images/logo.svg';
  return null;
}

export function sanitizeSubcategoryLogo(code: string, logoUrl?: string | null): string | null {
  if (!logoUrl) return getSubcategoryFallbackLogo(code);

  // If logoUrl is a Base64 data URI or abnormally large (> 500 chars),
  // substitute with a clean fallback URL to avoid multi-megabyte API responses.
  if (logoUrl.startsWith('data:') || logoUrl.length > 500) {
    return getSubcategoryFallbackLogo(code);
  }

  return logoUrl;
}

