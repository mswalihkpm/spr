import fs from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';
import sharp from 'sharp';
import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFName,
  PDFPage,
  RGB,
  StandardFonts,
  appendBezierCurve,
  clip,
  closePath,
  degrees,
  endPath,
  fill,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setFillingRgbColor,
  setLineWidth,
  setStrokingRgbColor,
  stroke,
} from 'pdf-lib';
import { extractGoogleDriveFileId, formatGoogleDriveDirectUrl, isGoogleDriveUrl } from './google-drive';
import type { StudentIdCardRecord } from './id-card-data';

// ============================================================================
// MILLIMETER-EXACT A4 PRINT GEOMETRY CONSTANTS
// ============================================================================
export const MM_TO_PT = 72 / 25.4;

export const A4_WIDTH_MM = 210.0;
export const A4_HEIGHT_MM = 297.0;

export const CARD_WIDTH_MM = 83.8;
export const CARD_HEIGHT_MM = 52.8;
export const CARDS_PER_PAGE = 5;

export const MARGIN_X_MM = 15.0;
export const COL_GAP_MM = 12.4;
export const FRONT_X_MM = MARGIN_X_MM; // 15.0 mm (15.0 .. 98.8 mm)
export const BACK_X_MM = MARGIN_X_MM + CARD_WIDTH_MM + COL_GAP_MM; // 111.2 mm (111.2 .. 195.0 mm)

export const MARGIN_TOP_MM = 8.5;
export const ROW_GAP_MM = 4.0;
export const CARD_CORNER_RADIUS_MM = (24 / 620) * CARD_WIDTH_MM; // ~3.244 mm (matches rounded-3xl)

export const CARD_DESIGN_WIDTH_PX = 620;
export const CARD_DESIGN_HEIGHT_PX = 391;

export interface GenerateBulkIdCardsPdfOptions {
  academicYear?: string;
  batchLabel?: string;
  showCutGuides?: boolean;
}

export interface GenerateBulkIdCardsPdfResult {
  pdfBytes: Uint8Array;
  pageCount: number;
  studentCount: number;
}

interface FontBundle {
  sans: PDFFont;
  sansBold: PDFFont;
  mono: PDFFont;
  monoBold: PDFFont;
}

interface AssetBundle {
  logoImage: PDFImage | null;
  sealImage: PDFImage | null;
  photoMap: Map<string, PDFImage | null>;
}

// Color palette matching DigitalStudentIdCard.tsx
const COLOR_NAVY_DEEP = rgb(10 / 255, 25 / 255, 47 / 255); // #0A192F
const COLOR_NAVY_CARD = rgb(15 / 255, 39 / 255, 78 / 255); // #0F274E
const COLOR_SLATE_950 = rgb(2 / 255, 6 / 255, 23 / 255); // #020617
const COLOR_SLATE_900 = rgb(15 / 255, 23 / 255, 42 / 255); // #0F172A
const COLOR_SLATE_800 = rgb(30 / 255, 41 / 255, 59 / 255); // #1E293B
const COLOR_SLATE_700 = rgb(51 / 255, 65 / 255, 85 / 255); // #334155
const COLOR_SLATE_500 = rgb(100 / 255, 116 / 255, 139 / 255); // #64748B
const COLOR_SLATE_400 = rgb(148 / 255, 163 / 255, 184 / 255); // #94A3B8
const COLOR_SLATE_300 = rgb(203 / 255, 213 / 255, 225 / 255); // #CBD5E1
const COLOR_SLATE_200 = rgb(226 / 255, 232 / 255, 240 / 255); // #E2E8F0

const COLOR_SKY_950 = rgb(8 / 255, 47 / 255, 73 / 255); // #082F49
const COLOR_SKY_900 = rgb(12 / 255, 74 / 255, 110 / 255); // #0C4A6E
const COLOR_SKY_700 = rgb(3 / 255, 105 / 255, 161 / 255); // #0369A1
const COLOR_SKY_600 = rgb(2 / 255, 132 / 255, 199 / 255); // #0284C7
const COLOR_SKY_400 = rgb(56 / 255, 189 / 255, 248 / 255); // #38BDF8
const COLOR_SKY_300 = rgb(125 / 255, 211 / 255, 252 / 255); // #7DD3FC
const COLOR_SKY_200 = rgb(186 / 255, 230 / 255, 253 / 255); // #BAE6FD
const COLOR_SKY_100 = rgb(224 / 255, 242 / 255, 254 / 255); // #E0F2FE
const COLOR_BLUE_700 = rgb(29 / 255, 78 / 255, 216 / 255); // #1D4ED8
const COLOR_WHITE = rgb(1, 1, 1);

// Pre-blended opaque equivalents for SVG translucent waves (eliminates print RIP alpha artifacts)
const COLOR_FRONT_TOP_BLUE_WAVE = rgb(28 / 255, 144 / 255, 205 / 255); // #0284C7 @ 0.9 over white
const COLOR_FRONT_BOTTOM_CYAN = rgb(18 / 255, 184 / 255, 213 / 255); // #06B6D4 @ 0.95 over pale sky
const COLOR_BACK_WAVE_MID = rgb(6 / 255, 88 / 255, 138 / 255); // #0284C7 @ 0.6 over #0A192F
const COLOR_BACK_WAVE_CYAN = rgb(0 / 255, 196 / 255, 227 / 255); // #00C9E8 @ 0.95 over mid/navy
const COLOR_BACK_DIVIDER = rgb(8 / 255, 79 / 255, 123 / 255); // #0284C7 @ 0.5 over #0A192F

function mm(val: number): number {
  return val * MM_TO_PT;
}

export function getRowTopMm(rowIndex: number): number {
  return MARGIN_TOP_MM + rowIndex * (CARD_HEIGHT_MM + ROW_GAP_MM);
}

export function getRowBottomFromPageBottomMm(rowIndex: number): number {
  return A4_HEIGHT_MM - (getRowTopMm(rowIndex) + CARD_HEIGHT_MM);
}

// ============================================================================
// WINANSI TEXT SAFETY & WORD WRAPPING
// ============================================================================
const WINANSI_MAP: Record<string, string> = {
  '\u2018': "'",
  '\u2019': "'",
  '\u201A': "'",
  '\u201C': '"',
  '\u201D': '"',
  '\u2026': '...',
  '\u2013': '-',
  '\u2014': '-',
  '\u2212': '-',
  '\u00A0': ' ',
  '\u2500': '-',
  '\u200B': '',
  '\u200C': '',
  '\u200D': '',
  '\uFEFF': '',
};

function sanitizeForWinAnsi(raw: string, font: PDFFont): string {
  const input = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!input) return '';

  let out = '';
  for (const ch of input) {
    const mapped = WINANSI_MAP[ch] ?? ch;
    if (!mapped) continue;
    try {
      font.encodeText(mapped);
      out += mapped;
    } catch {
      // Strip emojis / unsupported glyphs safely instead of crashing PDF generation
      out += ' ';
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

function measureWidth(text: string, font: PDFFont, fontSize: number): number {
  if (!text) return 0;
  return font.widthOfTextAtSize(text, fontSize);
}

function truncateToWidth(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string {
  const safe = sanitizeForWinAnsi(text, font);
  if (measureWidth(safe, font, fontSize) <= maxWidth) return safe;
  const ellipsis = '...';
  let lo = 0;
  let hi = safe.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = safe.slice(0, mid).trimEnd() + ellipsis;
    if (measureWidth(candidate, font, fontSize) <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo <= 0 ? '' : safe.slice(0, lo).trimEnd() + ellipsis;
}

function wrapTextLines(
  rawText: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  maxLines: number,
  breakLongWords = true
): string[] {
  const clean = sanitizeForWinAnsi(rawText, font);
  if (!clean) return [];
  if (maxLines <= 0) return [];

  const tokens = clean.split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';
  let truncated = false;

  const pushToken = (token: string): boolean => {
    const candidate = current ? `${current} ${token}` : token;
    if (measureWidth(candidate, font, fontSize) <= maxWidth) {
      current = candidate;
      return true;
    }
    if (current) {
      if (lines.length >= maxLines) return false;
      lines.push(current);
      current = '';
      if (lines.length >= maxLines) return false;
    }
    if (measureWidth(token, font, fontSize) <= maxWidth) {
      current = token;
      return true;
    }
    if (!breakLongWords) {
      if (lines.length >= maxLines) return false;
      lines.push(truncateToWidth(token, font, fontSize, maxWidth));
      return false;
    }
    // Split oversized contiguous string (e.g. long email or continuous uppercase identifier)
    let sliceStart = 0;
    while (sliceStart < token.length) {
      if (lines.length >= maxLines) return false;
      let end = sliceStart + 1;
      while (
        end <= token.length &&
        measureWidth(token.slice(sliceStart, end), font, fontSize) <= maxWidth
      ) {
        end++;
      }
      const fitEnd = Math.max(sliceStart + 1, end - 1);
      const chunk = token.slice(sliceStart, fitEnd);
      if (fitEnd < token.length) {
        lines.push(chunk);
      } else {
        current = chunk;
      }
      sliceStart = fitEnd;
    }
    return true;
  };

  for (const tok of tokens) {
    if (!pushToken(tok)) {
      truncated = true;
      break;
    }
  }
  if (current) {
    if (lines.length < maxLines) {
      lines.push(current);
    } else {
      truncated = true;
    }
  }

  if (truncated && lines.length > 0) {
    const lastIdx = lines.length - 1;
    lines[lastIdx] = truncateToWidth(lines[lastIdx] + ' ...', font, fontSize, maxWidth);
  }

  return lines;
}

/**
 * Splits text where line 1 has width `firstLineWidth` and subsequent lines have width `nextLineWidth`.
 */
function wrapAsymmetricLines(
  rawText: string,
  font: PDFFont,
  fontSize: number,
  firstLineWidth: number,
  nextLineWidth: number,
  maxLines: number
): string[] {
  const clean = sanitizeForWinAnsi(rawText, font);
  if (!clean || maxLines <= 0) return [];
  if (measureWidth(clean, font, fontSize) <= firstLineWidth || maxLines === 1) {
    return wrapTextLines(clean, font, fontSize, firstLineWidth, 1, true);
  }

  // Fit as many whole words as possible onto line 1 without forcing an ellipsis
  const words = clean.split(' ');
  let line1 = '';
  let usedWords = 0;
  for (let i = 0; i < words.length; i++) {
    const cand = line1 ? `${line1} ${words[i]}` : words[i];
    if (measureWidth(cand, font, fontSize) <= firstLineWidth) {
      line1 = cand;
      usedWords = i + 1;
    } else {
      break;
    }
  }

  if (!line1) {
    // First token itself exceeds firstLineWidth: break clean character chunk onto line 1
    let end = 1;
    while (end <= clean.length && measureWidth(clean.slice(0, end), font, fontSize) <= firstLineWidth) {
      end++;
    }
    const splitAt = Math.max(1, end - 1);
    line1 = clean.slice(0, splitAt);
    const rest = clean.slice(splitAt).trim();
    const restLines = rest
      ? wrapTextLines(rest, font, fontSize, nextLineWidth, maxLines - 1, true)
      : [];
    return [line1, ...restLines];
  }

  const remaining = words.slice(usedWords).join(' ');
  if (!remaining) return [line1];
  const restLines = wrapTextLines(remaining, font, fontSize, nextLineWidth, maxLines - 1, true);
  return [line1, ...restLines];
}

// ============================================================================
// SERVER IMAGE & PHOTO LOADER
// ============================================================================
async function loadPublicAssetBytes(relativePublicPath: string): Promise<Buffer | null> {
  try {
    const cleanRel = relativePublicPath.replace(/^\/+/, '');
    const publicDir = path.resolve(process.cwd(), 'public');
    const resolved = path.resolve(publicDir, cleanRel);
    if (!resolved.startsWith(publicDir + path.sep)) return null;
    return await fs.readFile(resolved);
  } catch {
    return null;
  }
}

async function fetchUrlWithTimeout(url: string, timeoutMs = 4500): Promise<Buffer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return null;
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType && !contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
      return null;
    }
    const ab = await res.arrayBuffer();
    if (!ab || ab.byteLength < 64) return null;
    return Buffer.from(ab);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveNormalizedPhotoJpeg(rawUrl?: string | null): Promise<Buffer | null> {
  if (!rawUrl || !rawUrl.trim()) return null;
  const trimmed = rawUrl.trim();
  let sourceBuffer: Buffer | null = null;

  if (trimmed.startsWith('data:image/')) {
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx !== -1) {
      const b64 = trimmed.slice(commaIdx + 1);
      try {
        sourceBuffer = Buffer.from(b64, 'base64');
      } catch {
        sourceBuffer = null;
      }
    }
  } else if (trimmed.startsWith('/') && !trimmed.startsWith('/api/')) {
    sourceBuffer = await loadPublicAssetBytes(trimmed);
  } else if (isGoogleDriveUrl(trimmed)) {
    const fileId = extractGoogleDriveFileId(trimmed);
    const candidates = [
      formatGoogleDriveDirectUrl(trimmed, 360),
      fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w360` : null,
      fileId ? `https://drive.google.com/uc?export=view&id=${fileId}` : null,
    ].filter((u): u is string => Boolean(u));

    for (const candidate of candidates) {
      sourceBuffer = await fetchUrlWithTimeout(candidate);
      if (sourceBuffer) break;
    }
  } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    sourceBuffer = await fetchUrlWithTimeout(trimmed);
  }

  if (!sourceBuffer) return null;

  try {
    // Normalize EXIF orientation and resize/crop to exact 4:5 print frame (300+ DPI at 18.92x23.63 mm)
    return await sharp(sourceBuffer)
      .rotate()
      .resize(220, 275, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();
  } catch {
    return null;
  }
}

async function preloadAndEmbedAssets(
  pdfDoc: PDFDocument,
  cards: StudentIdCardRecord[]
): Promise<AssetBundle> {
  const [logoBytes, sealBytes] = await Promise.all([
    loadPublicAssetBytes('logo.png'),
    loadPublicAssetBytes('official-seal.png'),
  ]);

  const [logoImage, sealImage] = await Promise.all([
    logoBytes ? pdfDoc.embedPng(logoBytes).catch(() => null) : Promise.resolve(null),
    sealBytes ? pdfDoc.embedPng(sealBytes).catch(() => null) : Promise.resolve(null),
  ]);

  const uniqueSources = Array.from(
    new Set(
      cards
        .map((c) => (c.rawPhotoUrl || c.photoUrl || '').trim())
        .filter(Boolean)
    )
  );

  const photoMap = new Map<string, PDFImage | null>();
  const CONCURRENCY = 10;

  for (let i = 0; i < uniqueSources.length; i += CONCURRENCY) {
    const batch = uniqueSources.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (srcKey) => {
        const jpegBuf = await resolveNormalizedPhotoJpeg(srcKey);
        if (!jpegBuf) {
          photoMap.set(srcKey, null);
          return;
        }
        try {
          const embedded = await pdfDoc.embedJpg(jpegBuf);
          photoMap.set(srcKey, embedded);
        } catch {
          photoMap.set(srcKey, null);
        }
      })
    );
  }

  return { logoImage, sealImage, photoMap };
}

// ============================================================================
// VECTOR PATH, CLIPPING & CARD COORDINATE SYSTEM
// ============================================================================
function appendRoundedRectPath(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  rInput: number
): void {
  const r = Math.min(rInput, w / 2, h / 2);
  const k = r * 0.5522847498;
  page.pushOperators(
    moveTo(x + r, y),
    lineTo(x + w - r, y),
    appendBezierCurve(x + w - r + k, y, x + w, y + r - k, x + w, y + r),
    lineTo(x + w, y + h - r),
    appendBezierCurve(x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h),
    lineTo(x + r, y + h),
    appendBezierCurve(x + r - k, y + h, x, y + h - r + k, x, y + h - r),
    lineTo(x, y + r),
    appendBezierCurve(x, y + r - k, x + r - k, y, x + r, y),
    closePath()
  );
}

function drawRoundedRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  options: { fillColor?: RGB; strokeColor?: RGB; lineWidth?: number }
): void {
  const { fillColor, strokeColor, lineWidth = 0.6 } = options;
  if (!fillColor && !strokeColor) return;

  if (fillColor) {
    page.pushOperators(pushGraphicsState(), setFillingRgbColor(fillColor.red, fillColor.green, fillColor.blue));
    appendRoundedRectPath(page, x, y, w, h, r);
    page.pushOperators(fill(), popGraphicsState());
  }
  if (strokeColor) {
    page.pushOperators(
      pushGraphicsState(),
      setStrokingRgbColor(strokeColor.red, strokeColor.green, strokeColor.blue),
      setLineWidth(lineWidth)
    );
    appendRoundedRectPath(page, x, y, w, h, r);
    page.pushOperators(stroke(), popGraphicsState());
  }
}

function pushRoundedClip(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  page.pushOperators(pushGraphicsState());
  appendRoundedRectPath(page, x, y, w, h, r);
  page.pushOperators(clip(), endPath());
}

/**
 * Maps canonical 620x391 CSS card coordinates (top-left origin) onto the exact 83.8x52.8 mm PDF box.
 */
class CardMapper {
  readonly xPt: number;
  readonly yPt: number;
  readonly wPt: number;
  readonly hPt: number;
  readonly sx: number;
  readonly sy: number;

  constructor(leftMm: number, topMm: number) {
    this.xPt = mm(leftMm);
    this.wPt = mm(CARD_WIDTH_MM);
    this.hPt = mm(CARD_HEIGHT_MM);
    this.yPt = mm(A4_HEIGHT_MM - topMm - CARD_HEIGHT_MM);
    this.sx = this.wPt / CARD_DESIGN_WIDTH_PX;
    this.sy = this.hPt / CARD_DESIGN_HEIGHT_PX;
  }

  px(cx: number): number {
    return this.xPt + cx * this.sx;
  }

  pyTop(cy: number): number {
    return this.yPt + this.hPt - cy * this.sy;
  }

  pyBox(cy: number, ch: number): number {
    return this.yPt + this.hPt - (cy + ch) * this.sy;
  }

  pw(cw: number): number {
    return cw * this.sx;
  }

  ph(ch: number): number {
    return ch * this.sy;
  }

  fontPt(cssPx: number): number {
    // 1 CSS px in 620x391 -> 0.3831 PDF pt
    return cssPx * this.sy;
  }
}

// ============================================================================
// MICRO VECTOR ICONS & QR CODE VECTOR RENDERER
// ============================================================================
function drawVectorQr(
  page: PDFPage,
  payload: string,
  x: number,
  y: number,
  sizePt: number
): void {
  const qr = QRCode.create(payload, { errorCorrectionLevel: 'H' });
  const count = qr.modules.size;
  const data = qr.modules.data;
  const modSize = sizePt / count;

  // White backing ensures quiet/clean contrast
  page.drawRectangle({
    x,
    y,
    width: sizePt,
    height: sizePt,
    color: COLOR_WHITE,
  });

  // Merge adjacent horizontal dark modules into single rectangles for crisp light PDFs
  for (let row = 0; row < count; row++) {
    const rowY = y + sizePt - (row + 1) * modSize;
    let col = 0;
    while (col < count) {
      if (data[row * count + col]) {
        const runStart = col;
        while (col < count && data[row * count + col]) {
          col++;
        }
        const runWidth = (col - runStart) * modSize;
        page.drawRectangle({
          x: x + runStart * modSize,
          y: rowY,
          width: runWidth + 0.04, // tiny anti-hairline overlap at non-integer zoom levels
          height: modSize + 0.04,
          color: COLOR_SLATE_900,
        });
      } else {
        col++;
      }
    }
  }
}

function drawMicroIcon(
  page: PDFPage,
  kind: 'school' | 'place' | 'phone' | 'email' | 'shield' | 'guardian',
  cx: number,
  cy: number,
  s: number,
  color: RGB
): void {
  const half = s / 2;
  if (kind === 'guardian') {
    page.drawCircle({
      x: cx,
      y: cy,
      size: half,
      color: COLOR_SKY_100,
    });
    return;
  }

  if (kind === 'school') {
    page.drawRectangle({
      x: cx - half * 0.72,
      y: cy - half * 0.75,
      width: s * 0.72,
      height: s * 0.72,
      borderColor: color,
      borderWidth: 0.45,
    });
    page.drawLine({
      start: { x: cx - half * 0.9, y: cy - half * 0.75 },
      end: { x: cx + half * 0.9, y: cy - half * 0.75 },
      thickness: 0.45,
      color,
    });
    page.drawRectangle({
      x: cx - s * 0.12,
      y: cy - half * 0.75,
      width: s * 0.24,
      height: s * 0.26,
      color,
    });
    return;
  }

  if (kind === 'place') {
    page.drawCircle({
      x: cx,
      y: cy + s * 0.14,
      size: s * 0.34,
      borderColor: color,
      borderWidth: 0.48,
    });
    page.drawCircle({
      x: cx,
      y: cy + s * 0.14,
      size: s * 0.11,
      color,
    });
    page.drawLine({
      start: { x: cx - s * 0.22, y: cy - s * 0.02 },
      end: { x: cx, y: cy - half * 0.8 },
      thickness: 0.48,
      color,
    });
    page.drawLine({
      start: { x: cx + s * 0.22, y: cy - s * 0.02 },
      end: { x: cx, y: cy - half * 0.8 },
      thickness: 0.48,
      color,
    });
    return;
  }

  if (kind === 'phone') {
    page.drawRectangle({
      x: cx - s * 0.28,
      y: cy - s * 0.42,
      width: s * 0.56,
      height: s * 0.84,
      borderColor: color,
      borderWidth: 0.48,
    });
    page.drawCircle({
      x: cx,
      y: cy - s * 0.24,
      size: s * 0.07,
      color,
    });
    return;
  }

  if (kind === 'email') {
    page.drawRectangle({
      x: cx - s * 0.45,
      y: cy - s * 0.3,
      width: s * 0.9,
      height: s * 0.6,
      borderColor: color,
      borderWidth: 0.45,
    });
    page.drawLine({
      start: { x: cx - s * 0.45, y: cy + s * 0.3 },
      end: { x: cx, y: cy - s * 0.02 },
      thickness: 0.45,
      color,
    });
    page.drawLine({
      start: { x: cx + s * 0.45, y: cy + s * 0.3 },
      end: { x: cx, y: cy - s * 0.02 },
      thickness: 0.45,
      color,
    });
    return;
  }

  if (kind === 'shield') {
    page.pushOperators(
      pushGraphicsState(),
      setStrokingRgbColor(color.red, color.green, color.blue),
      setLineWidth(0.55),
      moveTo(cx, cy + s * 0.46),
      lineTo(cx + s * 0.38, cy + s * 0.28),
      lineTo(cx + s * 0.34, cy - s * 0.16),
      lineTo(cx, cy - s * 0.48),
      lineTo(cx - s * 0.34, cy - s * 0.16),
      lineTo(cx - s * 0.38, cy + s * 0.28),
      closePath(),
      stroke(),
      popGraphicsState()
    );
    page.drawLine({
      start: { x: cx - s * 0.15, y: cy - s * 0.02 },
      end: { x: cx - s * 0.03, y: cy - s * 0.14 },
      thickness: 0.5,
      color,
    });
    page.drawLine({
      start: { x: cx - s * 0.03, y: cy - s * 0.14 },
      end: { x: cx + s * 0.19, y: cy + s * 0.14 },
      thickness: 0.5,
      color,
    });
  }
}

function drawBackStoreGraphic(
  page: PDFPage,
  cx: number,
  cy: number,
  boxSizePt: number
): void {
  // Storefront icon (above)
  const w = boxSizePt * 0.44;
  const h = boxSizePt * 0.34;
  const sy = cy + boxSizePt * 0.09;

  page.drawRectangle({
    x: cx - w * 0.42,
    y: sy - h * 0.45,
    width: w * 0.84,
    height: h * 0.55,
    borderColor: COLOR_SKY_400,
    borderWidth: 0.85,
  });
  // Awning top trapezoid
  page.pushOperators(
    pushGraphicsState(),
    setStrokingRgbColor(COLOR_SKY_400.red, COLOR_SKY_400.green, COLOR_SKY_400.blue),
    setLineWidth(0.85),
    moveTo(cx - w * 0.54, sy + h * 0.1),
    lineTo(cx - w * 0.4, sy + h * 0.48),
    lineTo(cx + w * 0.4, sy + h * 0.48),
    lineTo(cx + w * 0.54, sy + h * 0.1),
    closePath(),
    stroke(),
    popGraphicsState()
  );

  // Shopping Cart icon (below)
  const cyCart = cy - boxSizePt * 0.24;
  const cw = boxSizePt * 0.22;
  const ch = boxSizePt * 0.12;
  page.pushOperators(
    pushGraphicsState(),
    setStrokingRgbColor(1, 1, 1),
    setLineWidth(0.65),
    moveTo(cx - cw * 0.72, cyCart + ch * 0.55),
    lineTo(cx - cw * 0.45, cyCart + ch * 0.55),
    lineTo(cx - cw * 0.25, cyCart - ch * 0.3),
    lineTo(cx + cw * 0.55, cyCart - ch * 0.3),
    lineTo(cx + cw * 0.68, cyCart + ch * 0.35),
    lineTo(cx - cw * 0.4, cyCart + ch * 0.35),
    stroke(),
    popGraphicsState()
  );
  page.drawCircle({ x: cx - cw * 0.2, y: cyCart - ch * 0.58, size: 0.75, color: COLOR_WHITE });
  page.drawCircle({ x: cx + cw * 0.42, y: cyCart - ch * 0.58, size: 0.75, color: COLOR_WHITE });
}

// ============================================================================
// FRONT ID CARD RENDERER (EXACT 83.8 x 52.8 MM VECTOR REPLICA)
// ============================================================================
function drawFrontCard(
  page: PDFPage,
  card: StudentIdCardRecord,
  leftMm: number,
  topMm: number,
  fonts: FontBundle,
  assets: AssetBundle,
  academicYear: string
): void {
  const m = new CardMapper(leftMm, topMm);
  const cornerR = mm(CARD_CORNER_RADIUS_MM);

  pushRoundedClip(page, m.xPt, m.yPt, m.wPt, m.hPt, cornerR);

  // 1. Subtle 135deg Pale-Sky Background (#F0F9FF -> #FFFFFF -> #E0F2FE)
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    let c: RGB;
    if (t <= 0.5) {
      const k = t * 2;
      c = rgb(
        (240 + 15 * k) / 255,
        (249 + 6 * k) / 255,
        (255 + 0 * k) / 255
      );
    } else {
      const k = (t - 0.5) * 2;
      c = rgb(
        (255 - 31 * k) / 255,
        (255 - 13 * k) / 255,
        (255 - 1 * k) / 255
      );
    }
    const stripY = m.yPt + m.hPt - ((i + 1) * m.hPt) / steps;
    page.drawRectangle({
      x: m.xPt,
      y: stripY,
      width: m.wPt,
      height: m.hPt / steps + 0.5,
      color: c,
    });
  }

  // 2. Top-Right Decorative Waves (w: 48% -> x=[322.4..620], h: 40% -> cy=[0..156.4])
  {
    const wX0 = 322.4;
    const wSpanX = 297.6; // 620 - 322.4
    const wSpanY = 156.4; // 391 * 0.40
    const vx = (v: number) => m.px(wX0 + (v / 200) * wSpanX);
    const vy = (v: number) => m.pyTop((v / 100) * wSpanY);

    // Blue wave: M40 0 C100 0 120 70 200 60 L200 0 Z
    page.pushOperators(
      pushGraphicsState(),
      setFillingRgbColor(
        COLOR_FRONT_TOP_BLUE_WAVE.red,
        COLOR_FRONT_TOP_BLUE_WAVE.green,
        COLOR_FRONT_TOP_BLUE_WAVE.blue
      ),
      moveTo(vx(40), vy(0)),
      appendBezierCurve(vx(100), vy(0), vx(120), vy(70), vx(200), vy(60)),
      lineTo(vx(200), vy(0)),
      closePath(),
      fill(),
      popGraphicsState()
    );

    // Dark slate overlay wave: M80 0 C130 0 150 55 200 45 L200 0 Z
    page.pushOperators(
      pushGraphicsState(),
      setFillingRgbColor(COLOR_SLATE_900.red, COLOR_SLATE_900.green, COLOR_SLATE_900.blue),
      moveTo(vx(80), vy(0)),
      appendBezierCurve(vx(130), vy(0), vx(150), vy(55), vx(200), vy(45)),
      lineTo(vx(200), vy(0)),
      closePath(),
      fill(),
      popGraphicsState()
    );
  }

  // 3. Bottom Decorative Cyan Curve & Footer Strip (cy=[355..391])
  {
    const bx = (v: number) => m.px((v / 600) * 620);
    const by = (v: number) => m.pyTop(353 + v);

    // Gentle Cyan wave crest peeking crisply above footer without obscuring AUTH-REF
    page.pushOperators(
      pushGraphicsState(),
      setFillingRgbColor(
        COLOR_FRONT_BOTTOM_CYAN.red,
        COLOR_FRONT_BOTTOM_CYAN.green,
        COLOR_FRONT_BOTTOM_CYAN.blue
      ),
      moveTo(bx(0), by(14)),
      appendBezierCurve(bx(200), by(2), bx(420), by(22), bx(600), by(8)),
      lineTo(bx(600), by(38)),
      lineTo(bx(0), by(38)),
      closePath(),
      fill(),
      popGraphicsState()
    );

    // Dark #0A2540 bottom accent behind footer: M0 24 L600 24 L600 40 L0 40 Z
    page.drawRectangle({
      x: m.xPt,
      y: m.yPt,
      width: m.wPt,
      height: m.ph(16),
      color: rgb(10 / 255, 37 / 255, 64 / 255),
    });
  }

  // 4. Card Header (pt=12px, pb=8px, border-b at cy=58)
  {
    // Logo Container (40x40 at x=20, y=10)
    const logoBoxX = m.px(20);
    const logoBoxY = m.pyBox(10, 38);
    const logoBoxW = m.pw(38);
    const logoBoxH = m.ph(38);
    drawRoundedRect(page, logoBoxX, logoBoxY, logoBoxW, logoBoxH, m.pw(11), {
      fillColor: COLOR_WHITE,
      strokeColor: COLOR_SKY_200,
      lineWidth: 0.45,
    });

    if (assets.logoImage) {
      const dims = assets.logoImage.scale(1);
      const pad = m.pw(4);
      const availW = logoBoxW - pad * 2;
      const availH = logoBoxH - pad * 2;
      const ratio = Math.min(availW / dims.width, availH / dims.height);
      const dw = dims.width * ratio;
      const dh = dims.height * ratio;
      page.drawImage(assets.logoImage, {
        x: logoBoxX + (logoBoxW - dw) / 2,
        y: logoBoxY + (logoBoxH - dh) / 2,
        width: dw,
        height: dh,
      });
    }

    // Main Header Title
    page.drawText(sanitizeForWinAnsi('STUDENT PERFORMANCE RATE', fonts.sansBold), {
      x: m.px(68),
      y: m.pyTop(25),
      size: m.fontPt(14),
      font: fonts.sansBold,
      color: COLOR_SLATE_900,
    });
    page.drawText(sanitizeForWinAnsi("MA'DIN SCHOOL OF EXCELLENCE", fonts.sansBold), {
      x: m.px(68),
      y: m.pyTop(39),
      size: m.fontPt(10.5),
      font: fonts.sansBold,
      color: COLOR_SKY_700,
    });

    // Session Pill Badge (2026-27) top-right
    const sessionStr = sanitizeForWinAnsi(academicYear || card.academicYear || '2026-27', fonts.monoBold);
    const sessFontSize = m.fontPt(10);
    const sessTextW = measureWidth(sessionStr, fonts.monoBold, sessFontSize);
    const pillW = sessTextW + m.pw(16);
    const pillH = m.ph(18);
    const pillX = m.px(584) - pillW;
    const pillY = m.pyBox(20, 18);
    drawRoundedRect(page, pillX, pillY, pillW, pillH, m.pw(4.5), {
      fillColor: COLOR_SLATE_900,
    });
    page.drawText(sessionStr, {
      x: pillX + (pillW - sessTextW) / 2,
      y: pillY + (pillH - sessFontSize * 0.72) / 2,
      size: sessFontSize,
      font: fonts.monoBold,
      color: COLOR_WHITE,
    });

    // Header Bottom Border
    page.drawLine({
      start: { x: m.xPt, y: m.pyTop(56) },
      end: { x: m.xPt + m.wPt, y: m.pyTop(56) },
      thickness: 0.45,
      color: COLOR_SKY_200,
    });
  }

  // 5. Column 1 (Far Left): 4:5 Photo Box + Strong 8-Digit Pill
  {
    const col1X = m.px(20);
    const col1W = m.pw(140);
    const photoYCss = 66;
    const photoHCss = 175; // 140:175 = exact 4:5 aspect ratio
    const photoYPt = m.pyBox(photoYCss, photoHCss);
    const photoHPt = m.ph(photoHCss);
    const photoR = m.pw(14);

    // Rounded Clipped Photo Container
    pushRoundedClip(page, col1X, photoYPt, col1W, photoHPt, photoR);
    const photoKey = (card.rawPhotoUrl || card.photoUrl || '').trim();
    const photoImg = photoKey ? assets.photoMap.get(photoKey) : null;

    if (photoImg) {
      page.drawImage(photoImg, {
        x: col1X,
        y: photoYPt,
        width: col1W,
        height: photoHPt,
      });
    } else {
      // Sky-Blue Initials Monogram Fallback
      page.drawRectangle({
        x: col1X,
        y: photoYPt,
        width: col1W,
        height: photoHPt,
        color: COLOR_SKY_600,
      });
      // Soft gradient triangle accent
      page.pushOperators(
        pushGraphicsState(),
        setFillingRgbColor(COLOR_BLUE_700.red, COLOR_BLUE_700.green, COLOR_BLUE_700.blue),
        moveTo(col1X, photoYPt),
        lineTo(col1X + col1W, photoYPt),
        lineTo(col1X + col1W, photoYPt + photoHPt * 0.65),
        closePath(),
        fill(),
        popGraphicsState()
      );
      const initials = sanitizeForWinAnsi(
        (card.fullName || 'ST')
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((n) => n[0])
          .join('')
          .toUpperCase() || 'ST',
        fonts.sansBold
      );
      const initSize = m.fontPt(24);
      const initW = measureWidth(initials, fonts.sansBold, initSize);
      page.drawText(initials, {
        x: col1X + (col1W - initW) / 2,
        y: photoYPt + photoHPt * 0.5,
        size: initSize,
        font: fonts.sansBold,
        color: COLOR_WHITE,
      });
      const subLbl = 'SPR ID';
      const subSize = m.fontPt(9);
      const subW = measureWidth(subLbl, fonts.monoBold, subSize);
      page.drawText(subLbl, {
        x: col1X + (col1W - subW) / 2,
        y: photoYPt + photoHPt * 0.36,
        size: subSize,
        font: fonts.monoBold,
        color: COLOR_SKY_100,
      });
    }
    page.pushOperators(popGraphicsState());

    // Sky-400 Photo Frame Border
    drawRoundedRect(page, col1X, photoYPt, col1W, photoHPt, photoR, {
      strokeColor: COLOR_SKY_400,
      lineWidth: 0.9,
    });

    // Strong 8-Digit Code Pill Directly Under Photo
    const pillYCss = 250;
    const pillHCss = 38;
    const pillYPt = m.pyBox(pillYCss, pillHCss);
    const pillHPt = m.ph(pillHCss);
    drawRoundedRect(page, col1X, pillYPt, col1W, pillHPt, m.pw(10), {
      fillColor: COLOR_SLATE_900,
      strokeColor: COLOR_SLATE_800,
      lineWidth: 0.5,
    });

    const code8 = sanitizeForWinAnsi(card.eightDigitSprId || '00000000', fonts.monoBold);
    const code8Size = m.fontPt(14);
    const code8W = measureWidth(code8, fonts.monoBold, code8Size);
    page.drawText(code8, {
      x: col1X + (col1W - code8W) / 2,
      y: pillYPt + pillHPt * 0.48,
      size: code8Size,
      font: fonts.monoBold,
      color: COLOR_SKY_300,
    });

    const sprSub = sanitizeForWinAnsi(`SPR ID: ${card.sprId || 'SPR0000'}`, fonts.monoBold);
    const sprSubSize = m.fontPt(8.5);
    const sprSubW = measureWidth(sprSub, fonts.monoBold, sprSubSize);
    page.drawText(sprSub, {
      x: col1X + (col1W - sprSubW) / 2,
      y: pillYPt + pillHPt * 0.17,
      size: sprSubSize,
      font: fonts.monoBold,
      color: COLOR_SLATE_400,
    });
  }

  // 6. Column 2 (Middle): Name, Class Pill, Details, Seal & Verification Ref
  {
    const col2X = m.px(174);
    const col2W = m.pw(224); // ends at 398, leaving clean 14px gap before QR at 412

    // Student Name (Uppercase, 1-2 lines)
    const upperName = sanitizeForWinAnsi((card.fullName || 'STUDENT NAME').toUpperCase(), fonts.sansBold);
    let nameSizeCss = 15.5;
    let nameLines = wrapTextLines(upperName, fonts.sansBold, m.fontPt(nameSizeCss), col2W, 2, true);
    if (nameLines.length === 2) {
      nameSizeCss = 13.5;
      nameLines = wrapTextLines(upperName, fonts.sansBold, m.fontPt(nameSizeCss), col2W, 2, true);
    }
    const namePt = m.fontPt(nameSizeCss);
    let curCy = 78;
    for (const line of nameLines) {
      page.drawText(line, {
        x: col2X,
        y: m.pyTop(curCy),
        size: namePt,
        font: fonts.sansBold,
        color: COLOR_SLATE_900,
      });
      curCy += nameSizeCss * 1.16;
    }

    // Class Pill
    const classStr = sanitizeForWinAnsi(
      `Class: ${card.className || 'Assigned Class'}${card.division ? ` (${card.division})` : ''}`,
      fonts.sansBold
    );
    const classFontPt = m.fontPt(10.2);
    const classMaxW = col2W - m.pw(16);
    const classTrimmed = truncateToWidth(classStr, fonts.sansBold, classFontPt, classMaxW);
    const classTextW = measureWidth(classTrimmed, fonts.sansBold, classFontPt);
    const classPillYCss = curCy - 4;
    const classPillHCss = 18;
    drawRoundedRect(
      page,
      col2X,
      m.pyBox(classPillYCss, classPillHCss),
      classTextW + m.pw(14),
      m.ph(classPillHCss),
      m.pw(5),
      {
        fillColor: COLOR_SKY_100,
        strokeColor: COLOR_SKY_300,
        lineWidth: 0.45,
      }
    );
    page.drawText(classTrimmed, {
      x: col2X + m.pw(7),
      y: m.pyBox(classPillYCss, classPillHCss) + m.ph(5.2),
      size: classFontPt,
      font: fonts.sansBold,
      color: COLOR_SKY_900,
    });

    // Metadata Detail Rows (School, Place, Phone, Email, Optional Guardian)
    const detailItems: {
      kind: 'school' | 'place' | 'phone' | 'email' | 'guardian';
      label: string;
      value: string;
      mono?: boolean;
      maxLines?: number;
    }[] = [
      {
        kind: 'school',
        label: 'SCHOOL:',
        value: card.schoolName || "Ma'din School of Excellence",
        maxLines: 2,
      },
      {
        kind: 'place',
        label: 'PLACE:',
        value: card.location || '—',
        maxLines: 2,
      },
      {
        kind: 'phone',
        label: 'PHONE:',
        value: card.phone || '—',
        mono: true,
        maxLines: 1,
      },
      {
        kind: 'email',
        label: 'EMAIL:',
        value: card.email || '—',
        mono: true,
        maxLines: 2,
      },
    ];

    if (card.fatherName && card.fatherName !== '—') {
      detailItems.push({
        kind: 'guardian',
        label: 'GUARDIAN:',
        value: card.fatherName,
        maxLines: 2,
      });
    }

    let metaCy = classPillYCss + classPillHCss + 14;
    const maxMetaBottomCss = 312; // Reserve clean room above divider & seal at bottom
    const iconCenterX = col2X + m.pw(6);
    const textStartX = col2X + m.pw(17);
    const labelFontPt = m.fontPt(8.8);
    const valFontPt = m.fontPt(10.0);
    const valLineStepCss = 12.2;

    for (const item of detailItems) {
      if (metaCy > maxMetaBottomCss) break;

      drawMicroIcon(
        page,
        item.kind,
        iconCenterX,
        m.pyTop(metaCy - 3.5),
        m.pw(11),
        COLOR_SKY_600
      );
      if (item.kind === 'guardian') {
        page.drawText('P', {
          x: iconCenterX - m.pw(2.2),
          y: m.pyTop(metaCy - 1),
          size: m.fontPt(7.5),
          font: fonts.sansBold,
          color: COLOR_SKY_700,
        });
      }

      const labelW = measureWidth(item.label, fonts.sansBold, labelFontPt) + m.pw(3);
      page.drawText(item.label, {
        x: textStartX,
        y: m.pyTop(metaCy),
        size: labelFontPt,
        font: fonts.sansBold,
        color: COLOR_SLATE_400,
      });

      const valFont = item.mono ? fonts.monoBold : fonts.sansBold;
      const firstLineMaxW = Math.max(m.pw(40), col2X + col2W - (textStartX + labelW));
      const secondLineMaxW = col2X + col2W - textStartX;
      const wrappedLines = wrapAsymmetricLines(
        item.value,
        valFont,
        valFontPt,
        firstLineMaxW,
        secondLineMaxW,
        item.maxLines ?? 1
      );

      if (wrappedLines[0]) {
        page.drawText(wrappedLines[0], {
          x: textStartX + labelW,
          y: m.pyTop(metaCy),
          size: valFontPt,
          font: valFont,
          color: COLOR_SLATE_800,
        });
      }

      if (wrappedLines[1] && metaCy + valLineStepCss <= maxMetaBottomCss) {
        metaCy += valLineStepCss;
        page.drawText(wrappedLines[1], {
          x: textStartX,
          y: m.pyTop(metaCy),
          size: valFontPt,
          font: valFont,
          color: COLOR_SLATE_800,
        });
      }

      metaCy += 14.5;
    }

    // Verification Divider Line & Badge
    const divY = 322;
    page.drawLine({
      start: { x: col2X, y: m.pyTop(divY) },
      end: { x: col2X + col2W, y: m.pyTop(divY) },
      thickness: 0.45,
      color: COLOR_SKY_200,
    });

    drawMicroIcon(page, 'shield', col2X + m.pw(6), m.pyTop(335), m.pw(11), COLOR_SKY_700);
    page.drawText('Verified SPR Identity', {
      x: col2X + m.pw(16),
      y: m.pyTop(337),
      size: m.fontPt(8.5),
      font: fonts.sansBold,
      color: COLOR_SKY_700,
    });

    const authRef = sanitizeForWinAnsi(
      `AUTH-REF: ${(card.qrToken || 'SECURE-TOKEN').slice(0, 16)}`,
      fonts.mono
    );
    page.drawText(truncateToWidth(authRef, fonts.mono, m.fontPt(8), m.pw(140)), {
      x: col2X,
      y: m.pyTop(350),
      size: m.fontPt(8),
      font: fonts.mono,
      color: COLOR_SLATE_500,
    });

    // Official School Seal Stamp (92x92 CSS px, centered bottom-right of Col 2, rotated -15deg CSS = +15deg PDF)
    if (assets.sealImage) {
      const sealW = m.pw(92);
      const sealH = m.ph(92);
      // Center corresponds to right='2px', bottom='-4px' relative to Col 2 bottom-right (around cx=350, cy=324)
      const cxSeal = m.px(350);
      const cySeal = m.pyTop(324);
      const thetaRad = (15 * Math.PI) / 180;
      const dx = (sealW / 2) * Math.cos(thetaRad) - (sealH / 2) * Math.sin(thetaRad);
      const dy = (sealW / 2) * Math.sin(thetaRad) + (sealH / 2) * Math.cos(thetaRad);

      page.drawImage(assets.sealImage, {
        x: cxSeal - dx,
        y: cySeal - dy,
        width: sealW,
        height: sealH,
        rotate: degrees(15),
        opacity: 0.9,
      });
    }
  }

  // 7. Column 3 (Right): Large Vector QR Code Card + "SCAN HERE"
  {
    const qrBoxSizeCss = 184;
    const qrBoxX = m.px(416);
    const qrBoxW = m.pw(qrBoxSizeCss);
    const qrBoxHCss = 192;
    const qrBoxYCss = 114; // Centered vertically inside card body
    const qrBoxYPt = m.pyBox(qrBoxYCss, qrBoxHCss);
    const qrBoxHPt = m.ph(qrBoxHCss);

    drawRoundedRect(page, qrBoxX, qrBoxYPt, qrBoxW, qrBoxHPt, m.pw(14), {
      fillColor: COLOR_WHITE,
      strokeColor: COLOR_SKY_400,
      lineWidth: 0.9,
    });

    const qrCodePt = m.pw(160);
    const qrX = qrBoxX + (qrBoxW - qrCodePt) / 2;
    const qrY = qrBoxYPt + m.ph(22);
    drawVectorQr(page, card.qrPayload || `SPR:ID:${card.sprId}`, qrX, qrY, qrCodePt);

    const scanLbl = 'SCAN HERE';
    const scanSize = m.fontPt(8.5);
    const scanW = measureWidth(scanLbl, fonts.sansBold, scanSize);
    page.drawText(scanLbl, {
      x: qrBoxX + (qrBoxW - scanW) / 2,
      y: qrBoxYPt + m.ph(7),
      size: scanSize,
      font: fonts.sansBold,
      color: COLOR_SKY_950,
    });
  }

  // 8. Front Card Security Footer Strip (cy=[369..391])
  {
    const footerH = m.ph(22);
    page.drawRectangle({
      x: m.xPt,
      y: m.yPt,
      width: m.wPt,
      height: footerH,
      color: COLOR_SLATE_900,
    });
    const footerFontPt = m.fontPt(8.2);
    page.drawText('OFFICIAL INSTITUTIONAL DIGITAL CREDENTIAL', {
      x: m.px(20),
      y: m.yPt + m.ph(7.5),
      size: footerFontPt,
      font: fonts.sansBold,
      color: COLOR_SLATE_300,
    });
    const schoolFoot = sanitizeForWinAnsi("MA'DIN SCHOOL OF EXCELLENCE", fonts.monoBold);
    const schoolFootW = measureWidth(schoolFoot, fonts.monoBold, footerFontPt);
    page.drawText(schoolFoot, {
      x: m.px(600) - schoolFootW,
      y: m.yPt + m.ph(7.5),
      size: footerFontPt,
      font: fonts.monoBold,
      color: COLOR_SKY_300,
    });
  }

  page.pushOperators(popGraphicsState());

  // Outer Rounded Card Border Stroke (Exact 83.8 x 52.8 mm perimeter)
  drawRoundedRect(page, m.xPt, m.yPt, m.wPt, m.hPt, cornerR, {
    strokeColor: COLOR_SKY_200,
    lineWidth: 0.55,
  });
}

// ============================================================================
// BACK ID CARD RENDERER (EXACT 83.8 x 52.8 MM DEEP NAVY VECTOR REPLICA)
// ============================================================================
function drawBackCard(
  page: PDFPage,
  card: StudentIdCardRecord,
  leftMm: number,
  topMm: number,
  fonts: FontBundle,
  assets: AssetBundle
): void {
  const m = new CardMapper(leftMm, topMm);
  const cornerR = mm(CARD_CORNER_RADIUS_MM);

  pushRoundedClip(page, m.xPt, m.yPt, m.wPt, m.hPt, cornerR);

  // 1. Deep Navy Base Fill (#0A192F)
  page.drawRectangle({
    x: m.xPt,
    y: m.yPt,
    width: m.wPt,
    height: m.hPt,
    color: COLOR_NAVY_DEEP,
  });

  // 2. Bottom-Left Curved Wave Accents (w: 55% -> x=[0..341], h: 60% -> cy=[156.4..391])
  {
    const wSpanX = 341; // 620 * 0.55
    const wY0 = 156.4; // 391 * 0.40
    const wSpanY = 234.6; // 391 * 0.60
    const vx = (v: number) => m.px((v / 300) * wSpanX);
    const vy = (v: number) => m.pyTop(wY0 + (v / 200) * wSpanY);

    // Mid Blue Wave: M0 60 C80 120 180 160 300 200 L0 200 Z
    page.pushOperators(
      pushGraphicsState(),
      setFillingRgbColor(COLOR_BACK_WAVE_MID.red, COLOR_BACK_WAVE_MID.green, COLOR_BACK_WAVE_MID.blue),
      moveTo(vx(0), vy(60)),
      appendBezierCurve(vx(80), vy(120), vx(180), vy(160), vx(300), vy(200)),
      lineTo(vx(0), vy(200)),
      closePath(),
      fill(),
      popGraphicsState()
    );

    // Bright Cyan Wave: M0 110 C90 140 160 170 250 200 L0 200 Z
    page.pushOperators(
      pushGraphicsState(),
      setFillingRgbColor(COLOR_BACK_WAVE_CYAN.red, COLOR_BACK_WAVE_CYAN.green, COLOR_BACK_WAVE_CYAN.blue),
      moveTo(vx(0), vy(110)),
      appendBezierCurve(vx(90), vy(140), vx(160), vy(170), vx(250), vy(200)),
      lineTo(vx(0), vy(200)),
      closePath(),
      fill(),
      popGraphicsState()
    );
  }

  // 3. Back Top-Right Header Branding ("Student / Performance Rate" + Logo Badge)
  {
    const logoSize = m.pw(32);
    const logoX = m.px(596) - logoSize;
    const logoY = m.pyBox(16, 32);
    drawRoundedRect(page, logoX, logoY, logoSize, logoSize, m.pw(8), {
      fillColor: rgb(18 / 255, 52 / 255, 92 / 255),
      strokeColor: COLOR_SKY_400,
      lineWidth: 0.5,
    });
    if (assets.logoImage) {
      const dims = assets.logoImage.scale(1);
      const pad = m.pw(3.5);
      const availW = logoSize - pad * 2;
      const availH = logoSize - pad * 2;
      const ratio = Math.min(availW / dims.width, availH / dims.height);
      const dw = dims.width * ratio;
      const dh = dims.height * ratio;
      page.drawImage(assets.logoImage, {
        x: logoX + (logoSize - dw) / 2,
        y: logoY + (logoSize - dh) / 2,
        width: dw,
        height: dh,
      });
    }

    const brandGapX = logoX - m.pw(8);
    const t1 = 'Student';
    const t1Pt = m.fontPt(13);
    page.drawText(t1, {
      x: brandGapX - measureWidth(t1, fonts.sansBold, t1Pt),
      y: m.pyTop(27),
      size: t1Pt,
      font: fonts.sansBold,
      color: COLOR_WHITE,
    });

    const t2 = 'Performance Rate';
    const t2Pt = m.fontPt(11.5);
    page.drawText(t2, {
      x: brandGapX - measureWidth(t2, fonts.sansBold, t2Pt),
      y: m.pyTop(41),
      size: t2Pt,
      font: fonts.sansBold,
      color: COLOR_SKY_400,
    });
  }

  // 4. Left Store Graphic Column (center around x=92)
  {
    const storeSize = m.pw(80);
    const storeX = m.px(52);
    const storeY = m.pyBox(145, 80);
    drawRoundedRect(page, storeX, storeY, storeSize, storeSize, m.pw(14), {
      fillColor: COLOR_NAVY_CARD,
      strokeColor: COLOR_SKY_400,
      lineWidth: 0.85,
    });
    drawBackStoreGraphic(page, storeX + storeSize / 2, storeY + storeSize / 2, storeSize);

    const storeLbl = 'SPR STORE';
    const storeLblPt = m.fontPt(10);
    const storeLblW = measureWidth(storeLbl, fonts.sansBold, storeLblPt);
    page.drawText(storeLbl, {
      x: storeX + (storeSize - storeLblW) / 2,
      y: storeY - m.ph(14),
      size: storeLblPt,
      font: fonts.sansBold,
      color: COLOR_SKY_300,
    });
  }

  // 5. Vertical Divider Line
  page.drawLine({
    start: { x: m.px(164), y: m.pyTop(76) },
    end: { x: m.px(164), y: m.pyTop(320) },
    thickness: 0.8,
    color: COLOR_BACK_DIVIDER,
  });

  // 6. Right Column: "HOW TO USE AT THE STORE" + 4 Steps + IMPORTANT + Slogan
  {
    const rx = m.px(184);
    const rMaxW = m.px(596) - rx;

    // Header Pill
    const hdrText = 'HOW TO USE AT THE STORE';
    const hdrPt = m.fontPt(10.5);
    const hdrTextW = measureWidth(hdrText, fonts.sansBold, hdrPt);
    const hdrPillW = hdrTextW + m.pw(22);
    const hdrPillH = m.ph(19);
    const hdrPillY = m.pyBox(72, 19);
    drawRoundedRect(page, rx, hdrPillY, hdrPillW, hdrPillH, m.pw(9.5), {
      fillColor: COLOR_SKY_100,
    });
    page.drawText(hdrText, {
      x: rx + (hdrPillW - hdrTextW) / 2,
      y: hdrPillY + m.ph(5.5),
      size: hdrPt,
      font: fonts.sansBold,
      color: COLOR_SLATE_900,
    });

    // 4 Numbered Instructions
    const steps = [
      'Present your SPR ID Card at the store.',
      'Allow the Store Admin to scan your QR Code.',
      'Your student profile will be displayed automatically.',
      'Your available wallet balance and transaction history can be viewed instantly.',
    ];

    let stepCy = 109;
    const stepPt = m.fontPt(10.0);
    const badgeR = m.pw(7);
    const stepTextX = rx + m.pw(21);
    const stepMaxW = rMaxW - m.pw(21);

    steps.forEach((stepText, idx) => {
      const cyCenterPt = m.pyTop(stepCy - 3.5);
      page.drawCircle({
        x: rx + badgeR,
        y: cyCenterPt,
        size: badgeR,
        color: COLOR_SKY_400,
      });
      const numStr = String(idx + 1);
      const numPt = m.fontPt(8.8);
      const numW = measureWidth(numStr, fonts.sansBold, numPt);
      page.drawText(numStr, {
        x: rx + badgeR - numW / 2,
        y: cyCenterPt - numPt * 0.34,
        size: numPt,
        font: fonts.sansBold,
        color: COLOR_SLATE_950,
      });

      const lines = wrapTextLines(stepText, fonts.sans, stepPt, stepMaxW, 2, false);
      for (const line of lines) {
        page.drawText(line, {
          x: stepTextX,
          y: m.pyTop(stepCy),
          size: stepPt,
          font: fonts.sans,
          color: COLOR_SLATE_200,
        });
        stepCy += 13;
      }
      stepCy += 3.5;
    });

    // IMPORTANT Notice Box
    const impTopCss = Math.max(stepCy + 2, 206);
    const impH = 66;
    const impYPt = m.pyBox(impTopCss, impH);
    drawRoundedRect(page, rx, impYPt, rMaxW, m.ph(impH), m.pw(10), {
      fillColor: COLOR_NAVY_CARD,
      strokeColor: COLOR_SKY_400,
      lineWidth: 0.5,
    });

    drawMicroIcon(
      page,
      'shield',
      rx + m.pw(16),
      m.pyTop(impTopCss + 17),
      m.pw(14),
      COLOR_SKY_400
    );

    const impTextX = rx + m.pw(30);
    page.drawText('IMPORTANT', {
      x: impTextX,
      y: m.pyTop(impTopCss + 18),
      size: m.fontPt(9.8),
      font: fonts.sansBold,
      color: COLOR_SKY_300,
    });

    const impBody =
      'Keep your ID Card safe. Your QR Code provides secure access to your student wallet information at authorized SPR stores.';
    const impBodyPt = m.fontPt(8.9);
    const impLines = wrapTextLines(impBody, fonts.sans, impBodyPt, rMaxW - m.pw(38), 3, false);
    let impBodyCy = impTopCss + 31;
    for (const line of impLines) {
      page.drawText(line, {
        x: impTextX,
        y: m.pyTop(impBodyCy),
        size: impBodyPt,
        font: fonts.sans,
        color: COLOR_SLATE_300,
      });
      impBodyCy += 11.8;
    }

    // Slogan Ribbon with crisp vector flanking lines (WinAnsi safe, exact look of "── ONE CARD • ONE STUDENT • ONE WALLET ──")
    const slogan = sanitizeForWinAnsi('ONE CARD • ONE STUDENT • ONE WALLET', fonts.sansBold);
    const sloganPt = m.fontPt(9.5);
    const sloganW = measureWidth(slogan, fonts.sansBold, sloganPt);
    const sloganY = m.pyTop(302);
    const sloganCenterX = rx + rMaxW / 2;
    const sloganStartX = sloganCenterX - sloganW / 2;

    page.drawText(slogan, {
      x: sloganStartX,
      y: sloganY,
      size: sloganPt,
      font: fonts.sansBold,
      color: COLOR_SKY_400,
    });
    const ruleGap = m.pw(8);
    const ruleLen = m.pw(22);
    page.drawLine({
      start: { x: sloganStartX - ruleGap - ruleLen, y: sloganY + sloganPt * 0.34 },
      end: { x: sloganStartX - ruleGap, y: sloganY + sloganPt * 0.34 },
      thickness: 0.55,
      color: COLOR_SKY_400,
    });
    page.drawLine({
      start: { x: sloganStartX + sloganW + ruleGap, y: sloganY + sloganPt * 0.34 },
      end: { x: sloganStartX + sloganW + ruleGap + ruleLen, y: sloganY + sloganPt * 0.34 },
      thickness: 0.55,
      color: COLOR_SKY_400,
    });
  }

  // 7. Back Card Footer (SPR ID & 8-digit code pill bottom-left + credential bottom-right)
  {
    const footPillY = m.pyBox(342, 30);
    const footPillX = m.px(24);
    const p1 = 'SPR ID : ';
    const p2 = sanitizeForWinAnsi(card.sprId || 'SPR0000', fonts.monoBold);
    const p3 = sanitizeForWinAnsi(`(${card.eightDigitSprId || '00000000'})`, fonts.monoBold);

    const p1Pt = m.fontPt(11.5);
    const p2Pt = m.fontPt(13.5);
    const p3Pt = m.fontPt(11.0);

    const w1 = measureWidth(p1, fonts.sansBold, p1Pt);
    const w2 = measureWidth(p2, fonts.monoBold, p2Pt);
    const w3 = measureWidth(p3, fonts.monoBold, p3Pt);
    const gap23 = m.pw(5);
    const footPillW = w1 + w2 + gap23 + w3 + m.pw(24);

    drawRoundedRect(page, footPillX, footPillY, footPillW, m.ph(30), m.pw(9), {
      fillColor: COLOR_SLATE_950,
      strokeColor: COLOR_SKY_700,
      lineWidth: 0.5,
    });

    const baselineY = footPillY + m.ph(10);
    page.drawText(p1, {
      x: footPillX + m.pw(12),
      y: baselineY,
      size: p1Pt,
      font: fonts.sansBold,
      color: COLOR_SLATE_200,
    });
    page.drawText(p2, {
      x: footPillX + m.pw(12) + w1,
      y: baselineY,
      size: p2Pt,
      font: fonts.monoBold,
      color: COLOR_SKY_300,
    });
    page.drawText(p3, {
      x: footPillX + m.pw(12) + w1 + w2 + gap23,
      y: baselineY,
      size: p3Pt,
      font: fonts.monoBold,
      color: COLOR_SKY_400,
    });

    const credLbl = 'AUTHORIZED SPR STORE CREDENTIAL';
    const credPt = m.fontPt(8.4);
    const credW = measureWidth(credLbl, fonts.mono, credPt);
    page.drawText(credLbl, {
      x: m.px(596) - credW,
      y: footPillY + m.ph(10),
      size: credPt,
      font: fonts.mono,
      color: COLOR_SLATE_400,
    });
  }

  page.pushOperators(popGraphicsState());

  // Outer Rounded Card Border Stroke (Exact 83.8 x 52.8 mm perimeter)
  drawRoundedRect(page, m.xPt, m.yPt, m.wPt, m.hPt, cornerR, {
    strokeColor: COLOR_SKY_900,
    lineWidth: 0.55,
  });
}

// ============================================================================
// PRINT CROP TICKS, PAIR ALIGNMENT & A4 SHEET METADATA (MARGIN-ONLY)
// ============================================================================
function drawOuterCutMarks(
  page: PDFPage,
  leftMm: number,
  topMm: number
): void {
  const x0 = mm(leftMm);
  const x1 = mm(leftMm + CARD_WIDTH_MM);
  const y0 = mm(A4_HEIGHT_MM - topMm - CARD_HEIGHT_MM);
  const y1 = mm(A4_HEIGHT_MM - topMm);

  const offset = mm(0.45);
  const tickLen = mm(1.1);
  const tickColor = rgb(148 / 255, 163 / 255, 184 / 255);
  const thick = 0.3;

  const corners = [
    { x: x0, y: y0, dx: -1, dy: -1 },
    { x: x1, y: y0, dx: 1, dy: -1 },
    { x: x0, y: y1, dx: -1, dy: 1 },
    { x: x1, y: y1, dx: 1, dy: 1 },
  ];

  for (const c of corners) {
    page.drawLine({
      start: { x: c.x + c.dx * offset, y: c.y },
      end: { x: c.x + c.dx * (offset + tickLen), y: c.y },
      thickness: thick,
      color: tickColor,
    });
    page.drawLine({
      start: { x: c.x, y: c.y + c.dy * offset },
      end: { x: c.x, y: c.y + c.dy * (offset + tickLen) },
      thickness: thick,
      color: tickColor,
    });
  }
}

function drawSheetChrome(
  page: PDFPage,
  pageIndex: number,
  totalPages: number,
  rowCount: number,
  fonts: FontBundle,
  batchLabel: string,
  showCutGuides: boolean
): void {
  // Subtle top margin note (strictly inside y_top [2.5..5.5 mm], completely outside cards)
  const hdrY = mm(A4_HEIGHT_MM - 5.2);
  const metaPt = 5.8;
  const headerLeft = sanitizeForWinAnsi(
    `MA'DIN SCHOOL OF EXCELLENCE  |  SPR OFFICIAL ID CARDS (${batchLabel})  |  EXACT 83.8 x 52.8 MM`,
    fonts.sansBold
  );
  page.drawText(headerLeft, {
    x: mm(FRONT_X_MM),
    y: hdrY,
    size: metaPt,
    font: fonts.sansBold,
    color: COLOR_SLATE_500,
  });

  const pageLabel = `SHEET ${pageIndex + 1} OF ${totalPages}  (${rowCount} STUDENT${rowCount === 1 ? '' : 'S'})`;
  const pageLabelW = measureWidth(pageLabel, fonts.monoBold, metaPt);
  page.drawText(pageLabel, {
    x: mm(BACK_X_MM + CARD_WIDTH_MM) - pageLabelW,
    y: hdrY,
    size: metaPt,
    font: fonts.monoBold,
    color: COLOR_SLATE_700,
  });

  // Subtle bottom margin print instruction
  const ftrY = mm(3.6);
  page.drawText('PRINT AT 100% / ACTUAL SIZE (DO NOT FIT TO PAGE)', {
    x: mm(FRONT_X_MM),
    y: ftrY,
    size: 5.5,
    font: fonts.monoBold,
    color: COLOR_SLATE_500,
  });

  const rightFooter = 'LEFT COLUMN: FRONT CARD   |   RIGHT COLUMN: BACK CARD (MATCHED PER ROW)';
  const rightFooterW = measureWidth(rightFooter, fonts.sans, 5.5);
  page.drawText(rightFooter, {
    x: mm(BACK_X_MM + CARD_WIDTH_MM) - rightFooterW,
    y: ftrY,
    size: 5.5,
    font: fonts.sans,
    color: COLOR_SLATE_500,
  });

  // Center fold/pair guide dashed segments inside the 12.4 mm horizontal gap
  if (showCutGuides && rowCount > 0) {
    const centerX = mm(FRONT_X_MM + CARD_WIDTH_MM + COL_GAP_MM / 2);
    const guideColor = rgb(203 / 255, 213 / 255, 225 / 255);
    const segStep = mm(3.2);
    const segLen = mm(1.6);

    for (let r = 0; r < rowCount; r++) {
      const topMm = getRowTopMm(r);
      const yTopPt = mm(A4_HEIGHT_MM - topMm);
      const yBotPt = mm(A4_HEIGHT_MM - (topMm + CARD_HEIGHT_MM));
      for (let y = yBotPt; y + segLen <= yTopPt; y += segStep) {
        page.drawLine({
          start: { x: centerX, y },
          end: { x: centerX, y: y + segLen },
          thickness: 0.4,
          color: guideColor,
        });
      }

      // Tiny horizontal alignment tick for Front <-> Back row pairing
      const midY = (yTopPt + yBotPt) / 2;
      const badgeStr = String(r + 1);
      const badgePt = 5.6;
      const bw = measureWidth(badgeStr, fonts.monoBold, badgePt);
      page.drawCircle({
        x: centerX,
        y: midY,
        size: 4.8,
        color: COLOR_WHITE,
        borderColor: guideColor,
        borderWidth: 0.5,
      });
      page.drawText(badgeStr, {
        x: centerX - bw / 2,
        y: midY - badgePt * 0.34,
        size: badgePt,
        font: fonts.monoBold,
        color: COLOR_SLATE_500,
      });
    }
  }
}

// ============================================================================
// PUBLIC GENERATOR ENTRYPOINT
// ============================================================================
export async function generateBulkIdCardsA4Pdf(
  cards: StudentIdCardRecord[],
  options: GenerateBulkIdCardsPdfOptions = {}
): Promise<GenerateBulkIdCardsPdfResult> {
  if (!cards || cards.length === 0) {
    throw new Error('At least one student record is required to generate ID cards PDF.');
  }

  const academicYear = options.academicYear || cards[0]?.academicYear || '2026-27';
  const batchLabel = options.batchLabel || 'INSTITUTIONAL BATCH';
  const showCutGuides = options.showCutGuides !== false;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle('SPR Institutional Bulk Student ID Cards (A4)');
  pdfDoc.setSubject('5 Students Per A4 Page - Front & Back ID Cards (83.8 x 52.8 mm)');
  pdfDoc.setCreator('SPR A4 Vector ID Card Generator');
  pdfDoc.setProducer("Ma'din School of Excellence - SPR");

  // Disable Fit-to-Page print scaling so physical 83.8 x 52.8 mm dimensions print true to size
  const viewerPrefs = pdfDoc.context.obj({
    PrintScaling: PDFName.of('None'),
  });
  pdfDoc.catalog.set(PDFName.of('ViewerPreferences'), viewerPrefs);

  const [sans, sansBold, mono, monoBold, assets] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.Helvetica),
    pdfDoc.embedFont(StandardFonts.HelveticaBold),
    pdfDoc.embedFont(StandardFonts.Courier),
    pdfDoc.embedFont(StandardFonts.CourierBold),
    preloadAndEmbedAssets(pdfDoc, cards),
  ]);

  const fonts: FontBundle = { sans, sansBold, mono, monoBold };
  const totalPages = Math.ceil(cards.length / CARDS_PER_PAGE);

  const pageWidthPt = mm(A4_WIDTH_MM);
  const pageHeightPt = mm(A4_HEIGHT_MM);

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
    const startIdx = pageIdx * CARDS_PER_PAGE;
    const pageCards = cards.slice(startIdx, startIdx + CARDS_PER_PAGE);

    drawSheetChrome(
      page,
      pageIdx,
      totalPages,
      pageCards.length,
      fonts,
      batchLabel,
      showCutGuides
    );

    for (let rowIdx = 0; rowIdx < pageCards.length; rowIdx++) {
      const studentCard = pageCards[rowIdx];
      const topMm = getRowTopMm(rowIdx);

      // Left Column: Student Front Card
      drawFrontCard(page, studentCard, FRONT_X_MM, topMm, fonts, assets, academicYear);
      // Right Column: Same Student Back Card (same horizontal row)
      drawBackCard(page, studentCard, BACK_X_MM, topMm, fonts, assets);

      if (showCutGuides) {
        drawOuterCutMarks(page, FRONT_X_MM, topMm);
        drawOuterCutMarks(page, BACK_X_MM, topMm);
      }
    }
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  return {
    pdfBytes,
    pageCount: totalPages,
    studentCount: cards.length,
  };
}
