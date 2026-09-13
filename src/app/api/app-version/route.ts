import { NextResponse } from 'next/server';

// Server-side build and version metadata
// Whenever changes or new releases are deployed, this build identifier increments
const APP_VERSION = '1.2.0';
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || process.env.BUILD_ID || '2026.09.13.v2';

export async function GET() {
  return NextResponse.json(
    {
      version: APP_VERSION,
      buildId: BUILD_ID,
      timestamp: Date.now(),
      status: 'active',
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}
