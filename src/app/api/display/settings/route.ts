export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import {
  DEFAULT_TV_SLIDESHOW_SETTINGS,
  parseTvSlideshowSettings,
  parseTvSlideImages,
} from '@/lib/tv-slideshow-config';
import { TvSlideshowSettings, TvSlideImage } from '@/types';

// GET: Retrieve current TV slideshow configuration and image slides
export async function GET(req: NextRequest) {
  try {
    const [settingsRow, imagesRow] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: 'TV_SLIDESHOW_SETTINGS' } }),
      prisma.systemSetting.findUnique({ where: { key: 'TV_SLIDESHOW_IMAGES' } }),
    ]);

    const settings: TvSlideshowSettings = parseTvSlideshowSettings(settingsRow?.value);
    const images: TvSlideImage[] = parseTvSlideImages(imagesRow?.value);

    return NextResponse.json(
      { settings, images },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (err: any) {
    console.error('Error fetching TV slideshow settings:', err);
    return NextResponse.json(
      {
        settings: DEFAULT_TV_SLIDESHOW_SETTINGS,
        images: [],
        error: 'Failed to load settings',
      },
      { status: 500 }
    );
  }
}

// POST: Update TV slideshow configuration and image slides (Admin authenticated)
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { settings: newSettings, images: newImages } = body;

    const ops: Promise<any>[] = [];

    if (newSettings && typeof newSettings === 'object') {
      const parsedSettings = parseTvSlideshowSettings(JSON.stringify(newSettings));
      ops.push(
        prisma.systemSetting.upsert({
          where: { key: 'TV_SLIDESHOW_SETTINGS' },
          create: {
            key: 'TV_SLIDESHOW_SETTINGS',
            value: JSON.stringify(parsedSettings),
          },
          update: {
            value: JSON.stringify(parsedSettings),
          },
        })
      );
    }

    if (Array.isArray(newImages)) {
      const parsedImages = parseTvSlideImages(JSON.stringify(newImages));
      ops.push(
        prisma.systemSetting.upsert({
          where: { key: 'TV_SLIDESHOW_IMAGES' },
          create: {
            key: 'TV_SLIDESHOW_IMAGES',
            value: JSON.stringify(parsedImages),
          },
          update: {
            value: JSON.stringify(parsedImages),
          },
        })
      );
    }

    await Promise.all(ops);

    // Fetch refreshed state
    const [settingsRow, imagesRow] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: 'TV_SLIDESHOW_SETTINGS' } }),
      prisma.systemSetting.findUnique({ where: { key: 'TV_SLIDESHOW_IMAGES' } }),
    ]);

    const settings = parseTvSlideshowSettings(settingsRow?.value);
    const images = parseTvSlideImages(imagesRow?.value);

    return NextResponse.json({
      success: true,
      message: 'TV slideshow settings updated successfully.',
      settings,
      images,
    });
  } catch (err: any) {
    console.error('Error saving TV slideshow settings:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update TV slideshow settings.' },
      { status: 500 }
    );
  }
}
