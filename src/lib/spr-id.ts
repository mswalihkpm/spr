import { prisma } from './prisma';

/**
 * Validates whether a string matches the standard SPR Student ID format.
 * Recommended format: SPR followed by at least 4 digits (e.g., SPR0001, SPR0117, SPR10000).
 */
export function isValidSprId(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^SPR\d{4,}$/i.test(id.trim());
}

/**
 * Normalizes an SPR Student ID to standard uppercase trimmed format.
 * e.g., " spr0001 " -> "SPR0001"
 */
export function normalizeSprId(id?: string | null): string {
  if (!id) return '';
  return id.trim().toUpperCase();
}

/**
 * Server-side automatic sequential generator for the next available SPR Student ID.
 * Finds the highest numeric suffix in the database and returns the next formatted ID.
 * Example: highest is SPR0117 -> generates SPR0118.
 */
export async function generateNextSprId(txClient?: any): Promise<string> {
  const db = txClient || prisma;

  // Retrieve all existing sprStudentIds from the database
  const existingStudents = await db.student.findMany({
    where: {
      sprStudentId: {
        not: null,
      },
    },
    select: {
      sprStudentId: true,
    },
  });

  let maxNumber = 0;

  for (const s of existingStudents) {
    if (!s.sprStudentId) continue;
    const match = s.sprStudentId.trim().match(/^SPR(\d+)$/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  const nextNumber = maxNumber + 1;
  // Pad with at least 4 digits (e.g. 1 -> SPR0001, 118 -> SPR0118, 10000 -> SPR10000)
  return `SPR${String(nextNumber).padStart(4, '0')}`;
}

/**
 * Verifies whether a given SPR Student ID is available for assignment.
 * Returns { available: true } if valid and unused, or { available: false, error: "..." } if invalid/taken.
 */
export async function checkSprIdAvailable(
  sprId: string,
  excludeStudentId?: string,
  txClient?: any
): Promise<{ available: boolean; error?: string }> {
  const normalized = normalizeSprId(sprId);

  if (!normalized) {
    return { available: false, error: 'SPR Student ID cannot be empty.' };
  }

  if (!isValidSprId(normalized)) {
    return {
      available: false,
      error: `Invalid SPR Student ID format "${sprId}". Format must be SPR followed by at least 4 digits (e.g. SPR0001).`,
    };
  }

  const db = txClient || prisma;
  const existing = await db.student.findFirst({
    where: {
      sprStudentId: {
        equals: normalized,
        mode: 'insensitive',
      },
      ...(excludeStudentId ? { id: { not: excludeStudentId } } : {}),
    },
    select: {
      id: true,
      sprStudentId: true,
      fullName: true,
    },
  });

  if (existing) {
    return {
      available: false,
      error: 'SPR Student ID already exists. Please use a unique ID.',
    };
  }

  return { available: true };
}
