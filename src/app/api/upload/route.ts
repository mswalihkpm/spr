export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth';
import {
  uploadStudentPhoto,
  uploadBase64StudentPhoto,
  optimizePhotoToWebP,
} from '@/lib/supabase-storage';

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const contentType = req.headers.get('content-type') || '';
    let finalUrl = '';
    let uploadedPath = '';
    let filename = `photo_${Date.now()}`;
    let sizeBytes = 0;

    if (contentType.includes('application/json')) {
      const body = await req.json();
      const image = body.image || body.file || body.dataUrl;
      if (!image || typeof image !== 'string') {
        return NextResponse.json({ error: 'No image data provided.' }, { status: 400 });
      }

      // Check if Supabase credentials are configured
      const hasSupabaseKey =
        Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
        Boolean(process.env.SUPABASE_ANON_KEY) ||
        Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

      if (hasSupabaseKey) {
        try {
          const uploadRes = await uploadBase64StudentPhoto(image);
          finalUrl = uploadRes.url;
          uploadedPath = uploadRes.path;
          sizeBytes = uploadRes.sizeBytes;
        } catch (storageErr: any) {
          console.error('[UploadAPI] Supabase Storage upload failed, falling back to WebP Base64:', storageErr.message);
          // Fallback: Optimize image to WebP buffer and return base64
          const cleanBase64 = image.includes(',') ? image.split(',')[1] : image;
          const rawBuffer = Buffer.from(cleanBase64, 'base64');
          const optimized = await optimizePhotoToWebP(rawBuffer, 360, 85);
          finalUrl = `data:image/webp;base64,${optimized.buffer.toString('base64')}`;
          sizeBytes = optimized.buffer.length;
        }
      } else {
        // Fallback when Supabase key not yet supplied
        const cleanBase64 = image.includes(',') ? image.split(',')[1] : image;
        const rawBuffer = Buffer.from(cleanBase64, 'base64');
        const optimized = await optimizePhotoToWebP(rawBuffer, 360, 85);
        finalUrl = `data:image/webp;base64,${optimized.buffer.toString('base64')}`;
        sizeBytes = optimized.buffer.length;
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
      filename = file.name || `photo_${Date.now()}.webp`;

      const hasSupabaseKey =
        Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
        Boolean(process.env.SUPABASE_ANON_KEY) ||
        Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

      if (hasSupabaseKey) {
        try {
          const uploadRes = await uploadStudentPhoto(buffer);
          finalUrl = uploadRes.url;
          uploadedPath = uploadRes.path;
          sizeBytes = uploadRes.sizeBytes;
        } catch (storageErr: any) {
          console.error('[UploadAPI] Supabase Storage upload failed, falling back to WebP Base64:', storageErr.message);
          const optimized = await optimizePhotoToWebP(buffer, 360, 85);
          finalUrl = `data:image/webp;base64,${optimized.buffer.toString('base64')}`;
          sizeBytes = optimized.buffer.length;
        }
      } else {
        const optimized = await optimizePhotoToWebP(buffer, 360, 85);
        finalUrl = `data:image/webp;base64,${optimized.buffer.toString('base64')}`;
        sizeBytes = optimized.buffer.length;
      }
    }

    return NextResponse.json({
      success: true,
      url: finalUrl,
      path: uploadedPath,
      filename,
      sizeBytes,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload image.' },
      { status: 500 }
    );
  }
}
