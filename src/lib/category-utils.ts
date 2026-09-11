import {
  Layers,
  Award,
  BookOpen,
  GraduationCap,
  Trophy,
  Sparkles,
  Feather,
  Library,
} from 'lucide-react';

// Helper icon resolver for categories
export function getCategoryIcon(code: string, iconName?: string) {
  const c = code?.toUpperCase() || '';
  if (c === 'ISLAMIC' || c.includes('ISLAM')) return BookOpen;
  if (c === 'SCHOOL' || c.includes('ACADEMIC')) return GraduationCap;
  if (c === 'PROGRAMS' || c.includes('COMPETITION') || c.includes('SPORT')) return Trophy;
  if (c === 'CREATIVE_HUB' || c.includes('CREATIVE') || c.includes('ART')) return Sparkles;
  if (c === 'LITERARY' || c.includes('LIT') || c.includes('POEM')) return Feather;
  if (c === 'LIBRARY' || c.includes('READ')) return Library;
  if (c === 'QUALIFICATION' || c.includes('HIFZ') || c.includes('CERT')) return Award;

  if (iconName === 'BookOpen') return BookOpen;
  if (iconName === 'GraduationCap') return GraduationCap;
  if (iconName === 'Trophy') return Trophy;
  if (iconName === 'Sparkles') return Sparkles;
  if (iconName === 'Feather') return Feather;
  if (iconName === 'Library') return Library;
  if (iconName === 'Award') return Award;
  return Layers;
}

// Category theme colors
export function getCategoryColor(code: string) {
  const c = code?.toUpperCase() || '';
  if (c === 'ISLAMIC') return { bg: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-900 border-emerald-200', text: 'text-emerald-700', border: 'hover:border-emerald-500' };
  if (c === 'SCHOOL') return { bg: 'bg-indigo-600', light: 'bg-indigo-50 text-indigo-900 border-indigo-200', text: 'text-indigo-700', border: 'hover:border-indigo-500' };
  if (c === 'PROGRAMS') return { bg: 'bg-amber-500', light: 'bg-amber-50 text-amber-900 border-amber-200', text: 'text-amber-700', border: 'hover:border-amber-500' };
  if (c === 'CREATIVE_HUB') return { bg: 'bg-purple-600', light: 'bg-purple-50 text-purple-900 border-purple-200', text: 'text-purple-700', border: 'hover:border-purple-500' };
  if (c === 'LITERARY') return { bg: 'bg-rose-500', light: 'bg-rose-50 text-rose-900 border-rose-200', text: 'text-rose-700', border: 'hover:border-rose-500' };
  if (c === 'LIBRARY') return { bg: 'bg-teal-600', light: 'bg-teal-50 text-teal-900 border-teal-200', text: 'text-teal-700', border: 'hover:border-teal-500' };
  if (c === 'QUALIFICATION') return { bg: 'bg-blue-600', light: 'bg-blue-50 text-blue-900 border-blue-200', text: 'text-blue-700', border: 'hover:border-blue-500' };
  return { bg: 'bg-madin-900', light: 'bg-slate-100 text-slate-900 border-slate-200', text: 'text-slate-800', border: 'hover:border-madin-800' };
}

// Helper logo resolver for categories
export function getCategoryLogo(code?: string, logoUrl?: string | null): string | null {
  if (
    logoUrl &&
    (logoUrl.startsWith('/') ||
      logoUrl.startsWith('http://') ||
      logoUrl.startsWith('https://') ||
      logoUrl.startsWith('data:'))
  ) {
    return logoUrl;
  }
  const c = code?.toUpperCase() || '';
  if (c === 'ISLAMIC' || c.includes('ISLAM')) return '/jamiathul-hind.png';
  if (c === 'SCHOOL' || c.includes('ACADEMIC') || c.includes('SCHO')) return '/madin-academy.png';
  if (c === 'CREATIVE_HUB' || c.includes('CREATIVE') || c.includes('ART') || c.includes('CREA')) return '/creative-hub-logo.png';
  if (c === 'LITERARY' || c.includes('LIT')) return '/sahityotsav.png';
  if (c === 'PROGRAMS' || c.includes('COMPETITION') || c.includes('PROG')) return '/kalotsav.png';
  if (c === 'LIBRARY' || c.includes('READ') || c.includes('LIBRA')) return '/jamiathul-hind.png';
  if (c === 'QUALIFICATION' || c.includes('QUALIF')) return '/jamiathul-hind.png';
  return null;
}

// Category direct module link resolver (if applicable)
export function getCategoryModulePath(code: string) {
  const c = code?.toUpperCase() || '';
  if (c === 'ISLAMIC') return '/academics/islamic';
  if (c === 'SCHOOL') return '/academics/school';
  if (c === 'PROGRAMS') return '/programs';
  if (c === 'CREATIVE_HUB') return '/creative-hub';
  if (c === 'LITERARY') return '/literary';
  if (c === 'LIBRARY') return '/library';
  return null;
}
