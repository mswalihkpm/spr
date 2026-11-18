/**
 * Pure Formatting & Calculation Utilities
 * Independent from Prisma, database clients, or server-only modules.
 * Safe to import in both Client Components and Server Components.
 */

export function formatPoints(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '0';
  if (Number.isInteger(val)) {
    return val.toLocaleString('en-US');
  }
  const fixed = Number(val.toFixed(2));
  return fixed.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function normalizeScoreToPercentage(obtainedScore: number, maxScore: number): number {
  if (!maxScore || maxScore <= 0) return 0;
  const raw = (obtainedScore / maxScore) * 100;
  return Math.min(Math.max(Number(raw.toFixed(1)), 0), 100);
}

export function formatPercentage(val: number): string {
  return `${val.toFixed(1)}%`;
}
