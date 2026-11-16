import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isGoogleDriveUrl, formatGoogleDriveDirectUrl, extractGoogleDriveFileId } from '@/lib/google-drive';

const photoCache = new Map<string, { buffer: Buffer; contentType: string } | null>();
const studentPhotoUrlCache = new Map<string, string | null>();

export function invalidatePhotoCache(studentId?: string) {
  if (studentId) {
    photoCache.delete(studentId);
    studentPhotoUrlCache.delete(studentId);
  } else {
    photoCache.clear();
    studentPhotoUrlCache.clear();
  }
}

export async function handleStudentPhotoRequest(req: NextRequest, studentIdentifier: string) {
  try {
    if (!studentIdentifier) {
      return new NextResponse('Student ID required', { status: 400 });
    }

    const url = new URL(req.url);
    const shouldProxy = url.searchParams.get('proxy') === 'true';

    const cachedUrl = studentPhotoUrlCache.get(studentIdentifier);
    let photoStr: string | null = null;

    // Check if the identifier is already a raw Google Drive file ID
    const isDirectDriveId =
      /^[a-zA-Z0-9_-]{25,}$/.test(studentIdentifier) &&
      !studentIdentifier.startsWith('SPR') &&
      !studentIdentifier.startsWith('MSOE') &&
      !studentIdentifier.startsWith('cmtor');

    if (isDirectDriveId) {
      photoStr = `https://drive.google.com/file/d/${studentIdentifier}/view`;
    } else if (cachedUrl !== undefined) {
      photoStr = cachedUrl;
    } else {
      const student = await prisma.student.findFirst({
        where: {
          OR: [
            { id: studentIdentifier },
            { studentId: { equals: studentIdentifier, mode: 'insensitive' } },
            { sprStudentId: { equals: studentIdentifier, mode: 'insensitive' } },
          ],
        },
        select: { id: true, studentId: true, sprStudentId: true, photoUrl: true },
      });

      if (!student || !student.photoUrl || student.photoUrl.trim() === '') {
        studentPhotoUrlCache.set(studentIdentifier, null);
        return new NextResponse('Photo not found', { status: 404 });
      }

      photoStr = student.photoUrl.trim();
      studentPhotoUrlCache.set(studentIdentifier, photoStr);
      if (student.id) studentPhotoUrlCache.set(student.id, photoStr);
      if (student.studentId) studentPhotoUrlCache.set(student.studentId, photoStr);
      if (student.sprStudentId) studentPhotoUrlCache.set(student.sprStudentId, photoStr);
    }

    if (!photoStr) {
      return new NextResponse('Photo not found', { status: 404 });
    }

    // 1. Google Drive URLs
    if (isGoogleDriveUrl(photoStr)) {
      const fileId = extractGoogleDriveFileId(photoStr);
      const directUrl = formatGoogleDriveDirectUrl(photoStr, 360) || photoStr;

      // If server-side proxy is requested, stream the bytes directly (bypasses any ISP/client-side adblockers)
      if (shouldProxy && fileId) {
        const cached = photoCache.get(studentIdentifier);
        if (cached) {
          return new NextResponse(new Uint8Array(cached.buffer), {
            headers: {
              'Content-Type': cached.contentType,
              'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
            },
          });
        }

        // Try candidate URLs from server-side
        const candidateUrls = [
          directUrl,
          `https://drive.google.com/thumbnail?id=${fileId}&sz=w360`,
          `https://drive.google.com/uc?export=view&id=${fileId}`,
        ];

        for (const candidate of candidateUrls) {
          try {
            const fetchRes = await fetch(candidate, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
            });
            if (fetchRes.ok) {
              const ab = await fetchRes.arrayBuffer();
              const buffer = Buffer.from(ab);
              const contentType = fetchRes.headers.get('content-type') || 'image/jpeg';
              photoCache.set(studentIdentifier, { buffer, contentType });
              return new NextResponse(new Uint8Array(buffer), {
                headers: {
                  'Content-Type': contentType,
                  'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
                },
              });
            }
          } catch {
            // continue to next candidate
          }
        }
      }

      // Default: 307 Temporary redirect to Google CDN
      return NextResponse.redirect(directUrl, {
        status: 307,
        headers: {
          'Cache-Control': 'public, max-age=604800, s-maxage=2592000',
        },
      });
    }

    // 2. Direct external HTTPS URL
    if (photoStr.startsWith('http://') || photoStr.startsWith('https://')) {
      return NextResponse.redirect(photoStr, {
        status: 307,
        headers: {
          'Cache-Control': 'public, max-age=604800, s-maxage=2592000',
        },
      });
    }

    // 3. Data URI fallback (Base64)
    if (photoStr.startsWith('data:image/')) {
      const parts = photoStr.split(';base64,');
      if (parts.length === 2) {
        const contentType = parts[0].replace('data:', '');
        const buffer = Buffer.from(parts[1], 'base64');
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400, immutable',
          },
        });
      }
    }

    return new NextResponse('Photo format not supported', { status: 404 });
  } catch (err: any) {
    console.error('Photo fetch error:', err);
    return new NextResponse('Error loading photo', { status: 500 });
  }
}
