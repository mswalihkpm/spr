import crypto from 'crypto';
import QRCode from 'qrcode';
import { prisma } from './prisma';
import { formatGoogleDriveDirectUrl } from './google-drive';

export const QR_PAYLOAD_PREFIX = 'SPR:ID:';

/**
 * Generates a deterministic, unique, high-entropy 8-digit numeric SPR Number ID for a student.
 * E.g., "15762483", "76169346".
 * Uses cryptographic hashing seeded by student permanent identifiers.
 */
export function generateStrong8DigitCode(
  studentDbId: string,
  sprStudentId?: string | null
): string {
  const seed = `${studentDbId}:${sprStudentId || ''}:SPR_STRONG_8DIGIT_PIN_2026`;
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  const num = parseInt(hash.slice(0, 12), 16);
  return String(10000000 + (num % 90000000));
}

// Backward-compatible alias
export function generate8DigitSprId(
  sprStudentId?: string | null,
  studentDbId?: string | null
): string {
  if (studentDbId) {
    return generateStrong8DigitCode(studentDbId, sprStudentId);
  }
  const seed = `${sprStudentId || 'STUDENT'}:SPR_STRONG_8DIGIT_PIN_2026`;
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  const num = parseInt(hash.slice(0, 12), 16);
  return String(10000000 + (num % 90000000));
}

export function hashQrToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

export function generateSecureOpaqueToken(): string {
  // 32 cryptographically secure bytes -> 64 hex characters
  return `spr_qr_${crypto.randomBytes(32).toString('hex')}`;
}

export function formatQrPayload(token: string): string {
  return `${QR_PAYLOAD_PREFIX}${token.trim()}`;
}

export function extractQrTokenFromPayload(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith(QR_PAYLOAD_PREFIX)) {
    return trimmed.slice(QR_PAYLOAD_PREFIX.length).trim();
  }
  // If full URL was scanned (e.g., https://.../qr/token)
  const urlMatch = trimmed.match(/\/qr\/([a-zA-Z0-9_-]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1].trim();
  }
  return trimmed;
}

export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'H',
    margin: 0,
    width: 450,
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });
}

export async function generateQrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 0,
    width: 450,
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });
}

/**
 * Retrieves the existing active QR token for a student, or generates a new one.
 * Token is permanently associated unless revoked.
 */
export async function getOrCreateStudentQrToken(studentId: string, generatedBy = 'SYSTEM') {
  // Check for existing active token
  const existing = await prisma.studentQrToken.findFirst({
    where: {
      studentId,
      status: 'ACTIVE',
    },
  });

  if (existing) {
    const qrPayload = formatQrPayload(existing.qrToken);
    return {
      tokenRecord: existing,
      qrToken: existing.qrToken,
      qrPayload,
    };
  }

  // Generate new token
  const qrToken = generateSecureOpaqueToken();
  const qrTokenHash = hashQrToken(qrToken);

  const created = await prisma.studentQrToken.upsert({
    where: { studentId },
    create: {
      studentId,
      qrToken,
      qrTokenHash,
      status: 'ACTIVE',
      generatedBy,
    },
    update: {
      qrToken,
      qrTokenHash,
      status: 'ACTIVE',
      revokedAt: null,
      revokedReason: null,
      generatedBy,
    },
  });

  const qrPayload = formatQrPayload(created.qrToken);
  return {
    tokenRecord: created,
    qrToken: created.qrToken,
    qrPayload,
  };
}

/**
 * Revokes a student's active QR token.
 */
export async function revokeStudentQrToken(
  studentId: string,
  revokedReason = 'Administrative revocation'
) {
  return prisma.studentQrToken.update({
    where: { studentId },
    data: {
      status: 'REVOKED',
      revokedAt: new Date(),
      revokedReason,
    },
  });
}

/**
 * Revokes and regenerates a student's QR token (for Super Admins).
 */
export async function revokeAndRegenerateStudentQrToken(
  studentId: string,
  revokedReason = 'Admin initiated regeneration',
  generatedBy = 'SUPER_ADMIN'
) {
  const qrToken = generateSecureOpaqueToken();
  const qrTokenHash = hashQrToken(qrToken);

  const updatedToken = await prisma.studentQrToken.upsert({
    where: { studentId },
    update: {
      qrToken,
      qrTokenHash,
      status: 'ACTIVE',
      revokedAt: null,
      revokedReason: null,
      generatedBy,
    },
    create: {
      studentId,
      qrToken,
      qrTokenHash,
      status: 'ACTIVE',
      generatedBy,
    },
  });

  return {
    newToken: updatedToken,
    qrToken: updatedToken.qrToken,
    qrPayload: formatQrPayload(updatedToken.qrToken),
  };
}

/**
 * Authoritatively resolves a student and their wallet info using the QR token or manual SPR ID.
 */
export async function resolveStudentAndWallet(params: {
  qrToken?: string;
  sprStudentId?: string;
}) {
  const { qrToken, sprStudentId } = params;

  let studentId: string | null = null;

  if (qrToken) {
    const cleanToken = extractQrTokenFromPayload(qrToken);
    const tokenHash = hashQrToken(cleanToken);

    const tokenRecord = await prisma.studentQrToken.findFirst({
      where: {
        OR: [
          { qrToken: cleanToken },
          { qrTokenHash: tokenHash },
        ],
      },
      include: {
        student: {
          select: { id: true, status: true },
        },
      },
    });

    if (!tokenRecord) {
      return { error: 'Invalid QR code. No student match found.', status: 404 };
    }

    if (tokenRecord.status === 'REVOKED') {
      return {
        error: 'This QR code has been revoked. Please request a new Digital ID card from the Student Portal.',
        status: 410,
        isRevoked: true,
      };
    }

    if (tokenRecord.status !== 'ACTIVE') {
      return {
        error: `This QR code is currently ${tokenRecord.status.toLowerCase()}. Please contact administration.`,
        status: 403,
      };
    }

    studentId = tokenRecord.studentId;
  } else if (sprStudentId) {
    const cleanInput = sprStudentId.trim();
    const is8Digit = /^\d{8}$/.test(cleanInput);

    // STRICT SECURITY: Public SPR IDs (e.g. SPR0122) cannot be used to view wallet details
    if (!is8Digit) {
      return {
        error:
          'Access Restricted: Student wallet details cannot be accessed using public SPR IDs (such as SPR0122). Please scan the physical/digital QR code or enter the secure 8-digit number printed on the ID card.',
        status: 403,
      };
    }

    // Match strictly by strong 8-digit code
    const allStudentsForLookup = await prisma.student.findMany({
      select: { id: true, sprStudentId: true },
    });
    const match = allStudentsForLookup.find(
      (s) => generateStrong8DigitCode(s.id, s.sprStudentId) === cleanInput
    );

    if (!match) {
      return {
        error: `No student record found with 8-digit code "${cleanInput}". Please check the 8-digit number printed on the ID card.`,
        status: 404,
      };
    }

    studentId = match.id;
  } else {
    return { error: 'Either QR code or SPR Student ID is required.', status: 400 };
  }

  // Fetch full student, class, wallet, and recent transactions concurrently
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      sprStudentId: true,
      studentId: true,
      fullName: true,
      division: true,
      photoUrl: true,
      status: true,
      class: { select: { id: true, name: true } },
      academicYear: { select: { id: true, name: true } },
      wallet: {
        select: {
          id: true,
          balance: true,
          totalEarnings: true,
          totalTransferred: true,
          totalReceived: true,
          totalContributedToStore: true,
          updatedAt: true,
        },
      },
      transactions: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          reference: true,
          type: true,
          amount: true,
          balanceAfter: true,
          description: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!student) {
    return { error: 'Student record could not be loaded.', status: 404 };
  }

  // Calculate authoritative numbers
  const hasWallet = Boolean(student.wallet);
  const availableBalance = hasWallet ? Number(student.wallet?.balance || 0) : 0;
  const totalCredited = hasWallet ? Number(student.wallet?.totalEarnings || 0) : 0;
  const totalSpent = hasWallet
    ? Number(student.wallet?.totalTransferred || 0) + Number(student.wallet?.totalContributedToStore || 0)
    : 0;

  const formattedTransactions = (student.transactions || []).map((t) => ({
    id: t.id,
    reference: t.reference,
    type: t.type,
    amount: Number(t.amount),
    balanceAfter: Number(t.balanceAfter),
    description: t.description,
    status: t.status,
    date: t.createdAt.toISOString(),
  }));

  const eightDigitSprId = generateStrong8DigitCode(student.id, student.sprStudentId);
  const resolvedPhotoUrl = formatGoogleDriveDirectUrl(student.photoUrl, 400) || student.photoUrl || null;

  return {
    student: {
      id: student.id,
      sprStudentId: student.sprStudentId || 'N/A',
      eightDigitSprId,
      studentCode: student.studentId,
      fullName: student.fullName,
      className: student.class?.name || 'Class',
      division: student.division || 'A',
      academicYear: student.academicYear?.name || '2026-27',
      photoUrl: resolvedPhotoUrl,
      status: student.status,
    },
    wallet: hasWallet
      ? {
          isActivated: true,
          availableBalance,
          totalCredited,
          totalSpent,
          totalReceived: Number(student.wallet?.totalReceived || 0),
          lastUpdated: student.wallet?.updatedAt?.toISOString() || null,
        }
      : {
          isActivated: false,
          message: 'Wallet Not Yet Activated',
          availableBalance: 0,
          totalCredited: 0,
          totalSpent: 0,
        },
    transactions: formattedTransactions,
  };
}
