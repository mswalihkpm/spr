export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Read official base banner image into memory once
let bannerBuffer: Buffer | null = null;

function getBannerBuffer(): Buffer {
  if (!bannerBuffer) {
    const bannerPath = path.join(process.cwd(), 'public', 'branding', 'spr-official-banner.jpg');
    if (fs.existsSync(bannerPath)) {
      bannerBuffer = fs.readFileSync(bannerPath);
    } else {
      const fallbackPath = path.join(process.cwd(), 'public', 'spr-official-banner.jpg');
      bannerBuffer = fs.readFileSync(fallbackPath);
    }
  }
  return bannerBuffer;
}

export async function GET(_req: NextRequest) {
  try {
    const buffer = getBannerBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    console.error('OG Share banner error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
