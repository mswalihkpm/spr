export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const contentType = req.headers.get('content-type') || '';
    let dataUrl = '';
    let filename = `photo_${Date.now()}`;

    if (contentType.includes('application/json')) {
      const body = await req.json();
      const image = body.image || body.file || body.dataUrl;
      if (!image || typeof image !== 'string') {
        return NextResponse.json({ error: 'No image data provided.' }, { status: 400 });
      }

      if (image.startsWith('data:image/')) {
        dataUrl = image;
      } else {
        dataUrl = `data:image/jpeg;base64,${image}`;
      }
    } else {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
      }

      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Please upload a valid image file (JPEG, PNG, WebP).' },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      filename = file.name || `photo_${Date.now()}.jpg`;

      // Try optimizing with sharp if available in runtime
      try {
        const sharpModule = await import('sharp');
        const sharp = sharpModule.default || sharpModule;
        const optimizedBuffer = await sharp(buffer)
          .rotate() // auto-orient based on EXIF
          .resize(360, 360, { fit: 'cover', position: 'center' })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();

        dataUrl = `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
      } catch (sharpError) {
        // Fallback: direct base64 data URI
        const mimeType = file.type || 'image/jpeg';
        dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
      }
    }

    return NextResponse.json({
      success: true,
      url: dataUrl,
      filename,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload image.' },
      { status: 500 }
    );
  }
}
