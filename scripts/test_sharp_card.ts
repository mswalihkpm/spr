import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function testSharp() {
  console.log('Testing Sharp SVG card generation...');

  // SVG dimensions: 1200 x 630
  const svg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4c1d95" />
        <stop offset="45%" stop-color="#6d28d9" />
        <stop offset="85%" stop-color="#1d4ed8" />
        <stop offset="100%" stop-color="#0284c7" />
      </linearGradient>
      <linearGradient id="cyanAccent" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#06b6d4" />
        <stop offset="100%" stop-color="#0284c7" />
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#f59e0b" />
        <stop offset="100%" stop-color="#fbbf24" />
      </linearGradient>
    </defs>

    <!-- Background -->
    <rect width="1200" height="630" fill="url(#bgGrad)" />

    <!-- Subtle Right Geometric Accent -->
    <path d="M 980 0 L 1200 0 L 1200 630 L 880 630 Z" fill="#0284c7" fill-opacity="0.35" />

    <!-- Brand Header -->
    <g transform="translate(60, 50)">
      <!-- Logo Tile Container -->
      <rect x="0" y="0" width="70" height="70" rx="18" fill="#ffffff" />
      
      <!-- Excellence & SPR Platform Badge -->
      <text x="90" y="28" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="900" fill="#ffffff" letter-spacing="4">EXCELLENCE</text>
      
      <rect x="90" y="38" width="160" height="28" rx="8" fill="#2563eb" />
      <text x="170" y="57" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">SPR PLATFORM</text>
    </g>

    <!-- Main Title -->
    <text x="60" y="210" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="900" fill="#ffffff">
      Students
    </text>
    <text x="60" y="275" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="900" fill="#ffffff">
      Performance Rate <tspan fill="#fbbf24">(SPR)</tspan>
    </text>

    <!-- Subtitle -->
    <text x="60" y="340" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="500" fill="#e0e7ff" opacity="0.95">
      Track academic progress, achievements, rankings and school activities.
    </text>

    <!-- Available Now Pill -->
    <rect x="60" y="400" width="230" height="42" rx="21" fill="#1e1b4b" fill-opacity="0.7" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1.5" />
    <text x="175" y="427" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="1">
      SPR | Available Now
    </text>

    <!-- Google Play Mock Badge -->
    <rect x="60" y="470" width="220" height="64" rx="14" fill="#000000" stroke="#334155" stroke-width="1.5" />
    <text x="120" y="495" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="600" fill="#94a3b8" letter-spacing="1">GET IT ON</text>
    <text x="120" y="520" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="800" fill="#ffffff">Google Play</text>
  </svg>
  `;

  const outputDir = path.resolve('public/branding/test-cards');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, 'test-app-card.png');
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);

  console.log('Successfully generated test card:', outputPath, 'Size:', fs.statSync(outputPath).size);
}

testSharp().catch(console.error);

