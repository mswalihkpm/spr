import { createClient, SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import crypto from 'crypto';

import fs from 'fs';
import path from 'path';

// Load .env in CLI environment if not already loaded
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.slice(0, idx).trim();
          let v = trimmed.slice(idx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          if (!process.env[k]) {
            process.env[k] = v;
          }
        }
      }
    }
  } catch (e) {
    // Ignore in non-filesystem environments
  }
}

// Supabase configuration
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://sjfhldnuszrewncmysrv.supabase.co';

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || 'student-photos';

let supabaseClientInstance: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client using the service role key for administrative storage operations.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseClientInstance) {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.warn(
        '[SupabaseStorage] SUPABASE_SERVICE_ROLE_KEY is not configured in environment.'
      );
    }
    supabaseClientInstance = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseClientInstance;
}

/**
 * Generates a cryptographically random, unguessable storage path for a student photo.
 * Example format: "avatars/st_e4d909c290d04c53818e69248443ae38_1726230000000.webp"
 */
export function generateTokenizedPhotoPath(extension: string = 'webp'): string {
  const token = crypto.randomUUID().replace(/-/g, '');
  const timestamp = Date.now();
  return `avatars/st_${token}_${timestamp}.${extension}`;
}

/**
 * Constructs the public CDN URL for a file in the student-photos bucket.
 */
export function getPublicStorageUrl(filePath: string, bucket: string = STORAGE_BUCKET): string {
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${cleanPath}`;
}

/**
 * Checks if a given string is a Supabase Storage HTTPS URL.
 */
export function isSupabaseStorageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('http') && url.includes('/storage/v1/object/public/');
}

/**
 * Optimizes an image buffer into high-quality, lightweight WebP format.
 * - Auto-orients based on EXIF metadata
 * - Resizes to 360x360 (crisp high-DPI avatar display)
 * - Compresses with WebP quality 85
 */
export async function optimizePhotoToWebP(
  inputBuffer: Buffer,
  size: number = 360,
  quality: number = 85
): Promise<{ buffer: Buffer; contentType: string }> {
  const optimizedBuffer = await sharp(inputBuffer)
    .rotate() // auto-orient based on EXIF
    .resize(size, size, {
      fit: 'cover',
      position: 'center',
      withoutEnlargement: false,
    })
    .webp({
      quality,
      effort: 4,
      lossless: false,
    })
    .toBuffer();

  return {
    buffer: optimizedBuffer,
    contentType: 'image/webp',
  };
}

export interface UploadPhotoResult {
  success: boolean;
  url: string;
  path: string;
  sizeBytes: number;
  contentType: string;
}

/**
 * Uploads a raw photo buffer or File to Supabase Storage with WebP optimization
 * and returns the public CDN URL.
 */
export async function uploadStudentPhoto(
  inputBuffer: Buffer,
  options?: {
    customPath?: string;
    bucket?: string;
    skipOptimization?: boolean;
    quality?: number;
    size?: number;
  }
): Promise<UploadPhotoResult> {
  const bucket = options?.bucket || STORAGE_BUCKET;

  let bufferToUpload = inputBuffer;
  let contentType = 'image/webp';
  let filePath = options?.customPath || generateTokenizedPhotoPath('webp');

  if (!options?.skipOptimization) {
    const optimized = await optimizePhotoToWebP(
      inputBuffer,
      options?.size || 360,
      options?.quality || 85
    );
    bufferToUpload = optimized.buffer;
    contentType = optimized.contentType;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, bufferToUpload, {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  const publicUrl = getPublicStorageUrl(filePath, bucket);

  return {
    success: true,
    url: publicUrl,
    path: filePath,
    sizeBytes: bufferToUpload.length,
    contentType,
  };
}

/**
 * Uploads a Base64 data URI or raw Base64 string to Supabase Storage as WebP.
 */
export async function uploadBase64StudentPhoto(
  base64String: string,
  options?: {
    customPath?: string;
    bucket?: string;
    quality?: number;
  }
): Promise<UploadPhotoResult> {
  const cleanBase64 = base64String.includes(',')
    ? base64String.split(',')[1]
    : base64String;

  const rawBuffer = Buffer.from(cleanBase64, 'base64');
  return uploadStudentPhoto(rawBuffer, options);
}

/**
 * Deletes a photo from Supabase Storage by its file path or public URL.
 */
export async function deleteStudentPhoto(
  pathOrUrl: string,
  bucket: string = STORAGE_BUCKET
): Promise<boolean> {
  try {
    let filePath = pathOrUrl;
    if (pathOrUrl.startsWith('http')) {
      const parts = pathOrUrl.split(`/storage/v1/object/public/${bucket}/`);
      if (parts.length > 1) {
        filePath = parts[1];
      }
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) {
      console.error(`[SupabaseStorage] Delete error:`, error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error(`[SupabaseStorage] Delete exception:`, err?.message);
    return false;
  }
}
