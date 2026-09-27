import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const photoCache = new Map<string, { buffer: Buffer; contentType: string } | null>();

export function invalidatePhotoCache(studentId?: string) {
  if (studentId) {
    photoCache.delete(studentId);
  } else {
    photoCache.clear();
  }
}

export async function handleStudentPhotoRequest(req: NextRequest, studentIdentifier: string) {
  try {
    if (!studentIdentifier) {
      return new NextResponse('Student ID required', { status: 400 });
    }

    const cached = photoCache.get(studentIdentifier);
    if (cached) {
      return new NextResponse(new Uint8Array(cached.buffer), {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: studentIdentifier },
          { studentId: { equals: studentIdentifier, mode: 'insensitive' } },
          { sprStudentId: { equals: studentIdentifier, mode: 'insensitive' } },
        ],
      },
      select: { id: true, photoUrl: true },
    });

    if (!student || !student.photoUrl) {
      photoCache.set(studentIdentifier, null);
      return new NextResponse('Photo not found', { status: 404 });
    }

    const photoStr = student.photoUrl.trim();

    // Check if data URI (e.g. data:image/webp;base64,... or data:image/png;base64,...)
    if (photoStr.startsWith('data:image/')) {
      const parts = photoStr.split(';base64,');
      if (parts.length === 2) {
        const contentType = parts[0].replace('data:', '');
        const buffer = Buffer.from(parts[1], 'base64');
        photoCache.set(studentIdentifier, { buffer, contentType });
        if (student.id !== studentIdentifier) {
          photoCache.set(student.id, { buffer, contentType });
        }

        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    }

    // If external URL (e.g. https://...), redirect
    if (photoStr.startsWith('http://') || photoStr.startsWith('https://')) {
      return NextResponse.redirect(photoStr, 307);
    }

    // Fallback if raw base64 string
    try {
      const buffer = Buffer.from(photoStr, 'base64');
      const contentType = 'image/jpeg';
      photoCache.set(studentIdentifier, { buffer, contentType });
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch {
      return new NextResponse('Invalid image data', { status: 404 });
    }
  } catch (err: any) {
    console.error('Photo fetch error:', err);
    return new NextResponse('Error loading photo', { status: 500 });
  }
}
