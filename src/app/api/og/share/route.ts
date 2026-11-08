export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { prisma } from '@/lib/prisma';
import { calculateStudentSPR, calculateFastStudentRanks } from '@/lib/spr-engine';

// In-memory cache for generated card PNGs (10-minute TTL)
const cardBufferCache = new Map<string, { timestamp: number; buffer: Buffer }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapSvgText(text: string, maxCharsPerLine: number, maxLines = 3): string[] {
  if (!text) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }
  return lines;
}

function isSafeUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;

    const allowedHosts = [
      'drive.google.com',
      'googleusercontent.com',
      'lh3.googleusercontent.com',
      'msoerate.vercel.app',
      'localhost',
    ];

    const host = parsed.hostname.toLowerCase();
    const isAllowed =
      allowedHosts.some((allowed) => host === allowed || host.endsWith('.' + allowed)) ||
      host.endsWith('.supabase.co');

    if (
      host === '169.254.169.254' ||
      host === 'metadata.google.internal' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.')
    ) {
      return false;
    }

    return isAllowed;
  } catch {
    return false;
  }
}

// Convert local image or safe remote image to base64 data URI
async function getImageDataUri(sourceUrlOrPath: string): Promise<string | null> {
  try {
    // 1. Check local file system first
    const cleanPath = sourceUrlOrPath.startsWith('/') ? sourceUrlOrPath.slice(1) : sourceUrlOrPath;
    const localPath = path.resolve('public', cleanPath);
    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      const ext = path.extname(localPath).slice(1) || 'png';
      return `data:image/${ext};base64,${buffer.toString('base64')}`;
    }

    // 2. Safe remote URL fetching with strict timeout and size limit
    if (sourceUrlOrPath.startsWith('http://') || sourceUrlOrPath.startsWith('https://')) {
      if (!isSafeUrl(sourceUrlOrPath)) return null;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(sourceUrlOrPath, {
        signal: controller.signal,
        headers: { Accept: 'image/*' },
      });
      clearTimeout(timeout);

      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer.byteLength > 2 * 1024 * 1024) return null; // Reject files > 2MB

      // Resize thumbnail to 300x300
      const resized = await sharp(Buffer.from(arrayBuffer))
        .resize(300, 300, { fit: 'cover' })
        .png()
        .toBuffer();

      return `data:image/png;base64,${resized.toString('base64')}`;
    }
  } catch {
    // Graceful fallback to null on any network error
  }
  return null;
}

// Cached Base64 SPR Logo
let cachedLogoBase64: string | null = null;
async function getLogoBase64(): Promise<string> {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const logoPath = path.resolve('public/logo.png');
    if (fs.existsSync(logoPath)) {
      const buf = await sharp(logoPath).resize(140, 140, { fit: 'contain' }).png().toBuffer();
      cachedLogoBase64 = `data:image/png;base64,${buf.toString('base64')}`;
      return cachedLogoBase64;
    }
  } catch {}
  return '';
}

// Cached Phone Mockup for App Template
let cachedPhoneMockupBase64: string | null = null;
async function getPhoneMockupBase64(): Promise<string> {
  if (cachedPhoneMockupBase64) return cachedPhoneMockupBase64;
  try {
    const mockupPath = path.resolve('public/branding/phone-mockup-crop.png');
    if (fs.existsSync(mockupPath)) {
      const buf = fs.readFileSync(mockupPath);
      cachedPhoneMockupBase64 = `data:image/png;base64,${buf.toString('base64')}`;
      return cachedPhoneMockupBase64;
    }
  } catch {}
  return '';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const template = searchParams.get('template') || 'app';
    const id = searchParams.get('id') || '';

    // Cache key incorporates template and identifier
    const cacheKey = `${template}_${id}_${searchParams.toString()}`;
    const now = Date.now();
    const cached = cardBufferCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return new NextResponse(new Uint8Array(cached.buffer), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        },
      });
    }

    const logoUri = await getLogoBase64();

    let cardSvg = '';

    // =========================================================================
    // TEMPLATE 1: STUDENT DOSSIER
    // =========================================================================
    if (template === 'dossier') {
      let studentName = searchParams.get('name') || 'Student Performance Dossier';
      let className = searchParams.get('class') || 'Class 10';
      let division = searchParams.get('division') || 'A';
      let sprId = searchParams.get('sprId') || '';
      let rank = searchParams.get('rank') ? parseInt(searchParams.get('rank')!, 10) : 1;
      let score = searchParams.get('score') ? parseFloat(searchParams.get('score')!) : 0;
      let photoUrl = searchParams.get('photoUrl') || '';

      if (id) {
        const student = await prisma.student.findFirst({
          where: {
            OR: [
              { id },
              { studentId: { equals: id, mode: 'insensitive' } },
              { sprStudentId: { equals: id, mode: 'insensitive' } },
            ],
          },
          include: { class: true, school: true, academicYear: true },
        });

        if (student) {
          studentName = student.fullName;
          className = student.class?.name || className;
          division = student.division || division;
          sprId = student.sprStudentId || student.studentId;
          photoUrl = student.photoUrl || photoUrl;

          // Lightweight computation for rank and score
          const ranks = await calculateFastStudentRanks(
            student.id,
            student.academicYearId,
            student.classId,
            student.schoolId
          );
          rank = ranks.overallRank || rank;

          const profile = await calculateStudentSPR(student.id);
          score = profile?.overallSPR || score;
        }
      }

      // Safe portrait resolution
      let portraitUri = photoUrl ? await getImageDataUri(photoUrl) : null;

      const nameLines = wrapSvgText(studentName, 26, 2);

      cardSvg = `
      <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4c1d95" />
            <stop offset="40%" stop-color="#6d28d9" />
            <stop offset="80%" stop-color="#1d4ed8" />
            <stop offset="100%" stop-color="#0284c7" />
          </linearGradient>
          <clipPath id="avatarClip">
            <circle cx="950" cy="300" r="140" />
          </clipPath>
        </defs>

        <!-- Background -->
        <rect width="1200" height="630" fill="url(#bgGrad)" />

        <!-- Angled Modern Accent -->
        <path d="M 820 0 L 1200 0 L 1200 630 L 730 630 Z" fill="#0284c7" fill-opacity="0.25" />

        <!-- Header: Logo Tile & Branding -->
        <g transform="translate(60, 48)">
          <rect x="0" y="0" width="68" height="68" rx="18" fill="#ffffff" filter="drop-shadow(0px 8px 16px rgba(0,0,0,0.25))" />
          ${logoUri ? `<image href="${logoUri}" x="8" y="8" width="52" height="52" preserveAspectRatio="xMidYMid meet" />` : ''}
          <text x="88" y="27" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="900" fill="#ffffff" letter-spacing="4">EXCELLENCE</text>
          <rect x="88" y="37" width="165" height="28" rx="8" fill="#2563eb" />
          <text x="170" y="56" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">SPR PLATFORM</text>
        </g>

        <!-- Section Badge -->
        <g transform="translate(60, 160)">
          <rect x="0" y="0" width="310" height="34" rx="17" fill="#fbbf24" fill-opacity="0.2" stroke="#fbbf24" stroke-width="1.5" />
          <text x="155" y="22" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" fill="#fbbf24" text-anchor="middle" letter-spacing="2">
            STUDENT PERFORMANCE DOSSIER
          </text>
        </g>

        <!-- Student Full Name -->
        <g transform="translate(60, 245)">
          ${nameLines
            .map(
              (line, i) =>
                `<text x="0" y="${i * 54}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" fill="#ffffff">${escapeXml(
                  line
                )}</text>`
            )
            .join('')}
        </g>

        <!-- Class, Division & SPR ID Pills -->
        <g transform="translate(60, 360)">
          <rect x="0" y="0" width="160" height="38" rx="12" fill="#ffffff" fill-opacity="0.15" stroke="#ffffff" stroke-opacity="0.3" stroke-width="1.5" />
          <text x="80" y="24" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#ffffff" text-anchor="middle">
            ${escapeXml(className)} • Div ${escapeXml(division)}
          </text>

          ${
            sprId
              ? `
          <rect x="175" y="0" width="150" height="38" rx="12" fill="#2563eb" fill-opacity="0.4" stroke="#60a5fa" stroke-width="1.5" />
          <text x="250" y="24" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#93c5fd" text-anchor="middle">
            ${escapeXml(sprId)}
          </text>
          `
              : ''
          }
        </g>

        <!-- Metrics Badges: Rank & SPR Points -->
        <g transform="translate(60, 420)">
          <!-- Rank Card -->
          <rect x="0" y="0" width="190" height="74" rx="16" fill="#1e1b4b" fill-opacity="0.75" stroke="#fbbf24" stroke-width="2" />
          <text x="24" y="30" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#fbbf24" letter-spacing="1">INSTITUTIONAL RANK</text>
          <text x="24" y="60" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#ffffff">#${rank}</text>

          <!-- Score Card -->
          <rect x="205" y="0" width="220" height="74" rx="16" fill="#1e1b4b" fill-opacity="0.75" stroke="#60a5fa" stroke-width="1.5" />
          <text x="229" y="30" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#93c5fd" letter-spacing="1">OVERALL SPR POINTS</text>
          <text x="229" y="60" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#ffffff">${score.toFixed(
            2
          )} <tspan font-size="16" font-weight="600" fill="#94a3b8">pts</tspan></text>
        </g>

        <!-- Right Side: Circular Student Portrait / Avatar Rosette -->
        <g>
          <!-- Outer Glow Ring -->
          <circle cx="950" cy="300" r="156" fill="none" stroke="#fbbf24" stroke-width="5" stroke-dasharray="8 6" opacity="0.8" />
          <circle cx="950" cy="300" r="146" fill="#1e1b4b" stroke="#ffffff" stroke-width="6" />

          ${
            portraitUri
              ? `<image href="${portraitUri}" x="810" y="160" width="280" height="280" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice" />`
              : `
            <circle cx="950" cy="300" r="140" fill="#1e293b" />
            <text x="950" y="325" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="76" font-weight="900" fill="#fbbf24" text-anchor="middle">
              ${escapeXml(studentName.charAt(0))}
            </text>
          `
          }

          <!-- Gold Medal Rosette Badge on Avatar -->
          <g transform="translate(950, 435)">
            <rect x="-85" y="0" width="170" height="38" rx="19" fill="#f59e0b" stroke="#ffffff" stroke-width="2" />
            <text x="0" y="24" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="900" fill="#0f172a" text-anchor="middle" letter-spacing="1">
              ★ TOP SCHOLAR ★
            </text>
          </g>
        </g>

        <!-- Bottom Footer: Google Play Badge -->
        <g transform="translate(60, 525)">
          <rect x="0" y="0" width="225" height="58" rx="14" fill="#000000" stroke="#475569" stroke-width="1.5" />
          <path d="M 24 16 L 40 29 L 24 42 Z" fill="#38bdf8" />
          <path d="M 24 16 L 35 25 L 29 29 Z" fill="#4ade80" />
          <path d="M 24 42 L 35 33 L 29 29 Z" fill="#f87171" />
          <path d="M 40 29 L 35 25 L 35 33 Z" fill="#fbbf24" />
          <text x="54" y="24" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600" fill="#94a3b8" letter-spacing="1">GET IT ON</text>
          <text x="54" y="47" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800" fill="#ffffff">Google Play</text>
        </g>
      </svg>
      `;
    }

    // =========================================================================
    // TEMPLATE 2: NEWS & UPDATES
    // =========================================================================
    else if (template === 'news') {
      let title = searchParams.get('title') || 'Excellence Official Announcement';
      let date = searchParams.get('date') || 'Academic Session 2026';
      let subtitle =
        searchParams.get('subtitle') || 'Stay updated with the latest school events, activities and circulars.';
      let imageUrl = searchParams.get('imageUrl') || '';

      if (id) {
        const news = await prisma.news.findUnique({
          where: { id },
          select: { title: true, subtitle: true, body: true, imageUrl: true, createdAt: true },
        });
        if (news) {
          title = news.title;
          subtitle = news.subtitle || (news.body ? news.body.slice(0, 110) + '...' : subtitle);
          date = new Date(news.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });
          imageUrl = news.imageUrl || imageUrl;
        }
      }

      let posterUri = imageUrl ? await getImageDataUri(imageUrl) : null;
      const titleLines = wrapSvgText(title, 26, 3);
      const subLines = wrapSvgText(subtitle, 42, 2);

      cardSvg = `
      <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4c1d95" />
            <stop offset="40%" stop-color="#6d28d9" />
            <stop offset="80%" stop-color="#1d4ed8" />
            <stop offset="100%" stop-color="#0284c7" />
          </linearGradient>
          <clipPath id="posterClip">
            <rect x="760" y="130" width="380" height="420" rx="24" />
          </clipPath>
        </defs>

        <rect width="1200" height="630" fill="url(#bgGrad)" />
        <path d="M 820 0 L 1200 0 L 1200 630 L 730 630 Z" fill="#0284c7" fill-opacity="0.25" />

        <!-- Header -->
        <g transform="translate(60, 48)">
          <rect x="0" y="0" width="68" height="68" rx="18" fill="#ffffff" filter="drop-shadow(0px 8px 16px rgba(0,0,0,0.25))" />
          ${logoUri ? `<image href="${logoUri}" x="8" y="8" width="52" height="52" preserveAspectRatio="xMidYMid meet" />` : ''}
          <text x="88" y="27" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="900" fill="#ffffff" letter-spacing="4">EXCELLENCE</text>
          <rect x="88" y="37" width="165" height="28" rx="8" fill="#2563eb" />
          <text x="170" y="56" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">SPR PLATFORM</text>
        </g>

        <!-- Section Badge -->
        <g transform="translate(60, 160)">
          <rect x="0" y="0" width="220" height="34" rx="17" fill="#fbbf24" fill-opacity="0.2" stroke="#fbbf24" stroke-width="1.5" />
          <text x="110" y="22" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" fill="#fbbf24" text-anchor="middle" letter-spacing="2">
            NEWS &amp; UPDATES
          </text>
        </g>

        <!-- Date Pill -->
        <g transform="translate(295, 160)">
          <rect x="0" y="0" width="220" height="34" rx="17" fill="#ffffff" fill-opacity="0.12" stroke="#ffffff" stroke-opacity="0.3" stroke-width="1" />
          <text x="110" y="22" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#e2e8f0" text-anchor="middle">
            ${escapeXml(date)}
          </text>
        </g>

        <!-- Article Headline -->
        <g transform="translate(60, 245)">
          ${titleLines
            .map(
              (line, i) =>
                `<text x="0" y="${i * 52}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="40" font-weight="900" fill="#ffffff">${escapeXml(
                  line
                )}</text>`
            )
            .join('')}
        </g>

        <!-- Subtitle / Excerpt -->
        <g transform="translate(60, 420)">
          ${subLines
            .map(
              (line, i) =>
                `<text x="0" y="${i * 28}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="500" fill="#e0e7ff" opacity="0.95">${escapeXml(
                  line
                )}</text>`
            )
            .join('')}
        </g>

        <!-- Right Side: Poster Preview or Circular Visual -->
        <g>
          ${
            posterUri
              ? `
            <rect x="756" y="126" width="388" height="428" rx="28" fill="#1e1b4b" stroke="#ffffff" stroke-width="4" filter="drop-shadow(0px 12px 24px rgba(0,0,0,0.4))" />
            <image href="${posterUri}" x="760" y="130" width="380" height="420" clip-path="url(#posterClip)" preserveAspectRatio="xMidYMid slice" />
            `
              : `
            <rect x="760" y="130" width="380" height="420" rx="24" fill="#1e1b4b" fill-opacity="0.8" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2" />
            <circle cx="950" cy="310" r="80" fill="#2563eb" fill-opacity="0.3" stroke="#60a5fa" stroke-width="2" />
            <text x="950" y="325" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="900" fill="#fbbf24" text-anchor="middle">SPR</text>
            <text x="950" y="440" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#93c5fd" text-anchor="middle">Official School Gazette</text>
          `
          }
        </g>

        <!-- Bottom Footer: Google Play Badge -->
        <g transform="translate(60, 525)">
          <rect x="0" y="0" width="225" height="58" rx="14" fill="#000000" stroke="#475569" stroke-width="1.5" />
          <path d="M 24 16 L 40 29 L 24 42 Z" fill="#38bdf8" />
          <path d="M 24 16 L 35 25 L 29 29 Z" fill="#4ade80" />
          <path d="M 24 42 L 35 33 L 29 29 Z" fill="#f87171" />
          <path d="M 40 29 L 35 25 L 35 33 Z" fill="#fbbf24" />
          <text x="54" y="24" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600" fill="#94a3b8" letter-spacing="1">GET IT ON</text>
          <text x="54" y="47" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800" fill="#ffffff">Google Play</text>
        </g>
      </svg>
      `;
    }

    // =========================================================================
    // TEMPLATE 3: ACHIEVEMENTS & PODIUM HONORS
    // =========================================================================
    else if (template === 'achievement') {
      let studentName = searchParams.get('name') || 'SPR Podium Champion';
      let achievementTitle = searchParams.get('title') || 'Overall SPR Champions';
      let rankStr = searchParams.get('rank') || '1';
      let scoreStr = searchParams.get('score') || '521.51';
      let category = searchParams.get('category') || 'All Institutional Wings';

      const isRank1 = rankStr === '1' || rankStr.toLowerCase().includes('1st');
      const isRank2 = rankStr === '2' || rankStr.toLowerCase().includes('2nd');
      const badgeColor = isRank1 ? '#fbbf24' : isRank2 ? '#e2e8f0' : '#fb923c';
      const medalTitle = isRank1 ? '1ST CHAMPION' : isRank2 ? '2ND RANK' : '3RD RANK';

      const nameLines = wrapSvgText(studentName, 26, 2);

      cardSvg = `
      <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4c1d95" />
            <stop offset="40%" stop-color="#6d28d9" />
            <stop offset="80%" stop-color="#1d4ed8" />
            <stop offset="100%" stop-color="#0284c7" />
          </linearGradient>
        </defs>

        <rect width="1200" height="630" fill="url(#bgGrad)" />
        <path d="M 820 0 L 1200 0 L 1200 630 L 730 630 Z" fill="#0284c7" fill-opacity="0.25" />

        <!-- Header -->
        <g transform="translate(60, 48)">
          <rect x="0" y="0" width="68" height="68" rx="18" fill="#ffffff" filter="drop-shadow(0px 8px 16px rgba(0,0,0,0.25))" />
          ${logoUri ? `<image href="${logoUri}" x="8" y="8" width="52" height="52" preserveAspectRatio="xMidYMid meet" />` : ''}
          <text x="88" y="27" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="900" fill="#ffffff" letter-spacing="4">EXCELLENCE</text>
          <rect x="88" y="37" width="165" height="28" rx="8" fill="#2563eb" />
          <text x="170" y="56" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">SPR PLATFORM</text>
        </g>

        <!-- Achievement Badge -->
        <g transform="translate(60, 160)">
          <rect x="0" y="0" width="330" height="34" rx="17" fill="#fbbf24" fill-opacity="0.2" stroke="#fbbf24" stroke-width="1.5" />
          <text x="165" y="22" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" fill="#fbbf24" text-anchor="middle" letter-spacing="2">
            INSTITUTIONAL HONORS &amp; AWARDS
          </text>
        </g>

        <!-- Student Name -->
        <g transform="translate(60, 245)">
          ${nameLines
            .map(
              (line, i) =>
                `<text x="0" y="${i * 54}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" fill="#ffffff">${escapeXml(
                  line
                )}</text>`
            )
            .join('')}
        </g>

        <!-- Competition & Scope -->
        <g transform="translate(60, 360)">
          <text x="0" y="0" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="800" fill="#fbbf24">
            ${escapeXml(achievementTitle)}
          </text>
          <text x="0" y="32" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="500" fill="#e0e7ff" opacity="0.9">
            Category: ${escapeXml(category)}
          </text>
        </g>

        <!-- Standing Badges -->
        <g transform="translate(60, 435)">
          <rect x="0" y="0" width="210" height="62" rx="16" fill="#1e1b4b" fill-opacity="0.8" stroke="${badgeColor}" stroke-width="2" />
          <text x="105" y="39" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="900" fill="${badgeColor}" text-anchor="middle">
            ★ ${medalTitle} ★
          </text>

          <rect x="225" y="0" width="220" height="62" rx="16" fill="#1e1b4b" fill-opacity="0.8" stroke="#60a5fa" stroke-width="1.5" />
          <text x="335" y="39" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="900" fill="#ffffff" text-anchor="middle">
            ${escapeXml(scoreStr)} <tspan font-size="15" font-weight="600" fill="#94a3b8">pts</tspan>
          </text>
        </g>

        <!-- Right Side: Trophy Medallion -->
        <g transform="translate(950, 310)">
          <circle cx="0" cy="0" r="145" fill="#1e1b4b" stroke="${badgeColor}" stroke-width="6" />
          <circle cx="0" cy="0" r="125" fill="${badgeColor}" fill-opacity="0.15" />
          
          <!-- Trophy Icon -->
          <path d="M -45 -50 L 45 -50 L 35 15 C 28 35 15 45 0 45 C -15 45 -28 35 -35 15 Z" fill="${badgeColor}" />
          <path d="M -45 -35 C -65 -35 -65 -10 -40 -10" fill="none" stroke="${badgeColor}" stroke-width="7" stroke-linecap="round" />
          <path d="M 45 -35 C 65 -35 65 -10 40 -10" fill="none" stroke="${badgeColor}" stroke-width="7" stroke-linecap="round" />
          <rect x="-10" y="45" width="20" height="25" fill="${badgeColor}" />
          <rect x="-35" y="70" width="70" height="15" rx="5" fill="${badgeColor}" />

          <!-- Rosette ribbon -->
          <g transform="translate(0, 115)">
            <rect x="-90" y="0" width="180" height="36" rx="18" fill="#ffffff" stroke="${badgeColor}" stroke-width="2" />
            <text x="0" y="24" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="900" fill="#0f172a" text-anchor="middle" letter-spacing="1">
              OFFICIAL HONORS
            </text>
          </g>
        </g>

        <!-- Bottom Footer: Google Play Badge -->
        <g transform="translate(60, 525)">
          <rect x="0" y="0" width="225" height="58" rx="14" fill="#000000" stroke="#475569" stroke-width="1.5" />
          <path d="M 24 16 L 40 29 L 24 42 Z" fill="#38bdf8" />
          <path d="M 24 16 L 35 25 L 29 29 Z" fill="#4ade80" />
          <path d="M 24 42 L 35 33 L 29 29 Z" fill="#f87171" />
          <path d="M 40 29 L 35 25 L 35 33 Z" fill="#fbbf24" />
          <text x="54" y="24" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600" fill="#94a3b8" letter-spacing="1">GET IT ON</text>
          <text x="54" y="47" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800" fill="#ffffff">Google Play</text>
        </g>
      </svg>
      `;
    }

    // =========================================================================
    // TEMPLATE 4: GENERAL APPLICATION PROMOTION (MATCHES UPLOADED REFERENCE 100%)
    // =========================================================================
    else {
      const phoneMockupUri = await getPhoneMockupBase64();

      cardSvg = `
      <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4c1d95" />
            <stop offset="40%" stop-color="#6d28d9" />
            <stop offset="80%" stop-color="#1d4ed8" />
            <stop offset="100%" stop-color="#0284c7" />
          </linearGradient>
        </defs>

        <!-- Background -->
        <rect width="1200" height="630" fill="url(#bgGrad)" />

        <!-- Angled Modern Accent -->
        <path d="M 820 0 L 1200 0 L 1200 630 L 730 630 Z" fill="#0284c7" fill-opacity="0.35" />

        <!-- Brand Header: Logo Tile & Text -->
        <g transform="translate(70, 52)">
          <rect x="0" y="0" width="76" height="76" rx="20" fill="#ffffff" filter="drop-shadow(0px 8px 16px rgba(0,0,0,0.25))" />
          ${logoUri ? `<image href="${logoUri}" x="10" y="10" width="56" height="56" preserveAspectRatio="xMidYMid meet" />` : ''}
          <text x="96" y="30" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="900" fill="#ffffff" letter-spacing="4">EXCELLENCE</text>
          <rect x="96" y="42" width="180" height="30" rx="9" fill="#2563eb" />
          <text x="186" y="63" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">SPR PLATFORM</text>
        </g>

        <!-- Big Headline (Students Performance Rate (SPR)) -->
        <g transform="translate(70, 215)">
          <text x="0" y="0" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="900" fill="#ffffff">
            Students
          </text>
          <text x="0" y="62" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="900" fill="#ffffff">
            Performance Rate <tspan fill="#fbbf24">(SPR)</tspan>
          </text>
        </g>

        <!-- Subtitle -->
        <g transform="translate(70, 345)">
          <text x="0" y="0" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="23" font-weight="500" fill="#e0e7ff" opacity="0.95">
            Track academic progress, achievements,
          </text>
          <text x="0" y="34" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="23" font-weight="500" fill="#e0e7ff" opacity="0.95">
            rankings and school activities in one place.
          </text>
        </g>

        <!-- Geometric Heart Wireframe Accent -->
        <path d="M 580 340 C 580 320 600 310 615 325 C 630 310 650 320 650 340 C 650 365 615 385 615 385 C 615 385 580 365 580 340 Z" fill="none" stroke="#e0e7ff" stroke-width="2.5" opacity="0.4" />

        <!-- Available Now Pill -->
        <g transform="translate(70, 430)">
          <rect x="0" y="0" width="250" height="46" rx="23" fill="#1e1b4b" fill-opacity="0.75" stroke="#ffffff" stroke-opacity="0.25" stroke-width="1.5" />
          <text x="125" y="30" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="1">
            SPR | Available Now
          </text>
        </g>

        <!-- Google Play Store Button -->
        <g transform="translate(70, 502)">
          <rect x="0" y="0" width="240" height="66" rx="16" fill="#000000" stroke="#475569" stroke-width="1.5" />
          <path d="M 26 18 L 44 33 L 26 48 Z" fill="#38bdf8" />
          <path d="M 26 18 L 38 29 L 32 33 Z" fill="#4ade80" />
          <path d="M 26 48 L 38 37 L 32 33 Z" fill="#f87171" />
          <path d="M 44 33 L 38 29 L 38 37 Z" fill="#fbbf24" />
          <text x="58" y="28" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#94a3b8" letter-spacing="1">GET IT ON</text>
          <text x="58" y="53" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" fill="#ffffff">Google Play</text>
        </g>

        <!-- Right Side: Phone Mockup from Reference Image -->
        <g transform="translate(720, 25)">
          ${
            phoneMockupUri
              ? `<image href="${phoneMockupUri}" x="0" y="0" width="450" height="580" preserveAspectRatio="xMidYMid contain" filter="drop-shadow(0px 20px 40px rgba(0,0,0,0.5))" />`
              : `
            <!-- Fallback Vector Smartphone Frame -->
            <rect x="40" y="20" width="370" height="560" rx="44" fill="#ffffff" stroke="#94a3b8" stroke-width="6" />
            <rect x="55" y="45" width="340" height="510" rx="32" fill="#0f172a" />
            <text x="225" y="280" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="900" fill="#fbbf24" text-anchor="middle">SPR APP</text>
            <text x="225" y="320" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600" fill="#94a3b8" text-anchor="middle">Mobile Edition</text>
          `
          }
        </g>
      </svg>
      `;
    }

    // Convert SVG to pristine PNG with Sharp
    const pngBuffer = await sharp(Buffer.from(cardSvg)).png().toBuffer();

    // Cache the output buffer
    cardBufferCache.set(cacheKey, { timestamp: now, buffer: pngBuffer });

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('OG Share Image Generation Error:', error);
    return new NextResponse('Failed to generate sharing image.', { status: 500 });
  }
}

