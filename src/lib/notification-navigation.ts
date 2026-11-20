/**
 * SPR Student Portal - Notification Deep Link Navigation Utility
 *
 * Hardened validation and sanitisation for push notification destination URLs.
 * Guarantees that notifications only navigate to authenticated, safe internal student routes.
 *
 * Security & Defense-in-Depth Guarantees:
 * 1. Accepts ONLY safe internal '/student' or '/student/...' destinations.
 * 2. Strictly rejects external origins (e.g. https://evil.com/student/dashboard).
 * 3. Strictly rejects scheme-relative URLs (e.g. //evil.com/student).
 * 4. Strictly rejects backslashes ('\') to prevent Windows path injection and domain confusion (e.g. \/evil.com).
 * 5. Strictly rejects control characters (ASCII 0x00-0x1F, 0x7F) and CRLF injection.
 * 6. Detects and rejects single-level, multi-level, and malformed URL-encoded directory traversal (e.g. %2e%2e, %252e%252e).
 * 7. Strictly rejects dangerous pseudo-protocols (javascript:, data:, vbscript:, file:).
 * 8. Prevents path-prefix confusion (e.g. /students, /student_admin, /student-portal).
 * 9. Preserves legitimate query parameters only when safe and well-formed.
 * 10. Always falls back to '/student/dashboard' on any validation failure.
 */

const FALLBACK_STUDENT_ROUTE = '/student/dashboard';

// Control characters pattern: ASCII 0x00 to 0x1F, plus 0x7F (DEL)
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/;

// Scheme check: protocol name followed by colon before query or slash
const SCHEME_REGEX = /^[a-zA-Z][a-zA-Z0-9+.-]*:/i;

// Dangerous keywords even if disguised
const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];

export interface ValidationResult {
  isValid: boolean;
  safeUrl: string;
}

/**
 * Normalises and validates a student portal destination URL.
 */
export function normalizeAndValidateStudentUrl(url?: string | null): ValidationResult {
  if (!url || typeof url !== 'string') {
    return { isValid: false, safeUrl: FALLBACK_STUDENT_ROUTE };
  }

  const trimmed = url.trim();

  // 1. Minimum length & initial structural checks
  if (trimmed.length === 0 || trimmed.length > 512) {
    return { isValid: false, safeUrl: FALLBACK_STUDENT_ROUTE };
  }

  // 2. Reject control characters and unprintable bytes
  if (CONTROL_CHARS_REGEX.test(trimmed)) {
    return { isValid: false, safeUrl: FALLBACK_STUDENT_ROUTE };
  }

  // 3. Reject backslashes anywhere in the URL (prevents domain confusion & path injection)
  if (trimmed.includes('\\')) {
    return { isValid: false, safeUrl: FALLBACK_STUDENT_ROUTE };
  }

  // 4. Must begin with a single forward slash (reject protocol-relative '//')
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return { isValid: false, safeUrl: FALLBACK_STUDENT_ROUTE };
  }

  // 5. Reject explicit URL schemes
  if (SCHEME_REGEX.test(trimmed)) {
    return { isValid: false, safeUrl: FALLBACK_STUDENT_ROUTE };
  }

  for (const proto of DANGEROUS_PROTOCOLS) {
    if (trimmed.toLowerCase().includes(proto)) {
      return { isValid: false, safeUrl: FALLBACK_STUDENT_ROUTE };
    }
  }

  // 6. Multi-level URL decoding to catch nested encoding (e.g. %252e%252e -> %2e%2e -> ..)
  let decoded = trimmed;
  for (let i = 0; i < 3; i++) {
    try {
      const nextDecoded = decodeURIComponent(decoded);
      if (nextDecoded === decoded) break;
      decoded = nextDecoded;
    } catch {
      // Malformed URI encoding
      return { isValid: false, safeUrl: FALLBACK_STUDENT_ROUTE };
    }
  }

  // 7. Check for directory traversal in decoded string
  if (
    decoded.includes('..') ||
    decoded.includes('\\') ||
    CONTROL_CHARS_REGEX.test(decoded)
  ) {
    return { isValid: false, safeUrl: FALLBACK_STUDENT_ROUTE };
  }

  // 8. Separate path and query string
  const [pathPart, ...queryParts] = trimmed.split('?');

  // Path prefix confusion prevention:
  // Must be strictly '/student' or start with '/student/'
  // (Rejects /students, /student-panel, /student_admin)
  if (pathPart !== '/student' && !pathPart.startsWith('/student/')) {
    return { isValid: false, safeUrl: FALLBACK_STUDENT_ROUTE };
  }

  // Segment validation: verify each segment contains only safe alphanumeric/hyphen/underscore characters
  const segments = pathPart.split('/').filter(Boolean);
  // First segment is always 'student'
  if (segments[0] !== 'student') {
    return { isValid: false, safeUrl: FALLBACK_STUDENT_ROUTE };
  }

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    // Reject empty, dot, or traversal segments
    if (!seg || seg === '.' || seg === '..') {
      return { isValid: false, safeUrl: FALLBACK_STUDENT_ROUTE };
    }
    // Only permit standard URL slug characters: letters, digits, hyphens, underscores, brackets
    if (!/^[a-zA-Z0-9_\-\[\]]+$/.test(seg)) {
      return { isValid: false, safeUrl: FALLBACK_STUDENT_ROUTE };
    }
  }

  // 9. Query string validation (if present)
  let safeQuery = '';
  if (queryParts.length > 0) {
    const rawQuery = queryParts.join('?');
    // Reject queries with dangerous characters, HTML tags, or unencoded quotes
    if (
      rawQuery.includes('<') ||
      rawQuery.includes('>') ||
      rawQuery.includes('"') ||
      rawQuery.includes("'") ||
      rawQuery.includes(' ') ||
      rawQuery.includes('\\') ||
      CONTROL_CHARS_REGEX.test(rawQuery)
    ) {
      return { isValid: false, safeUrl: FALLBACK_STUDENT_ROUTE };
    }
    safeQuery = '?' + rawQuery;
  }

  const safeUrl = pathPart + safeQuery;
  return { isValid: true, safeUrl };
}

/**
 * Checks whether a given destination URL is a safe, internal student route.
 */
export function isSafeStudentUrl(url?: string | null): boolean {
  return normalizeAndValidateStudentUrl(url).isValid;
}

/**
 * Sanitises an incoming notification deep link, returning a safe student route.
 * If the provided URL is invalid or unsafe, safely falls back to '/student/dashboard'.
 */
export function sanitizeStudentDeepLink(url?: string | null): string {
  return normalizeAndValidateStudentUrl(url).safeUrl;
}
