/**
 * Safe Image URL Validation Helper
 * 
 * Objectives:
 * 1. Allow valid HTTPS image URLs and safe internal relative paths.
 * 2. Reject unsafe schemes: javascript:, data:, file:, blob:, vbscript:.
 * 3. Reject localhost, 127.0.0.1, private IP ranges (SSRF prevention).
 * 4. Reject Base64 payloads or abnormally long strings (> 1000 characters).
 */

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
  sanitizedUrl?: string;
}

// Regex for private/loopback IPv4 addresses
const PRIVATE_IPV4_REGEX = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.|0\.0\.0\.0)/;

export function validateImageUrl(inputUrl: string | null | undefined): UrlValidationResult {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { valid: false, error: 'Logo URL is required and must be a string.' };
  }

  const trimmed = inputUrl.trim();

  // 1. Length check: Base64 strings are tens/hundreds of thousands of chars. Legitimate URLs are < 1000 chars.
  if (trimmed.length > 1000) {
    return { valid: false, error: 'URL is too long (maximum 1000 characters). Base64 image strings are strictly prohibited.' };
  }

  // 2. Reject prohibited schemes explicitly
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('data:') ||
    lower.startsWith('javascript:') ||
    lower.startsWith('file:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('vbscript:')
  ) {
    return { valid: false, error: 'Unsafe URL scheme detected. Only secure HTTPS URLs are permitted.' };
  }

  // 3. Allow safe internal relative paths (e.g. /kuthbkhana-logo.png)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    if (/\.(png|jpg|jpeg|webp|svg|gif)$/i.test(trimmed)) {
      return { valid: true, sanitizedUrl: trimmed };
    }
    return { valid: false, error: 'Relative path must point to a valid image file (.png, .jpg, .webp, .svg).' };
  }

  // 4. Parse as standard absolute URL
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format. Please provide a well-formed HTTPS URL.' };
  }

  // 5. Must use HTTPS
  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only secure HTTPS URLs are allowed (http, data, and ftp are prohibited).' };
  }

  // 6. Hostname checks (SSRF Prevention)
  const hostname = parsed.hostname.toLowerCase();

  // Check localhost & IPv6 loopbacks
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local')
  ) {
    return { valid: false, error: 'Localhost and local network addresses are prohibited.' };
  }

  // Check private IPv4 ranges
  if (PRIVATE_IPV4_REGEX.test(hostname)) {
    return { valid: false, error: 'Private and internal IP addresses are prohibited.' };
  }

  // AWS / Cloud metadata link-local address check
  if (hostname === '169.254.169.254') {
    return { valid: false, error: 'Cloud metadata IP addresses are strictly prohibited.' };
  }

  return { valid: true, sanitizedUrl: parsed.toString() };
}

