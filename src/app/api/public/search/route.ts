export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';

    if (!q) {
      return NextResponse.json({ students: [] });
    }

    // Split search query into individual words/tokens for flexible multi-term matching
    const words = q.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return NextResponse.json({ students: [] });
    }

    const andConditions = words.map((w) => ({
      OR: [
        { fullName: { contains: w, mode: 'insensitive' as const } },
        { studentId: { contains: w, mode: 'insensitive' as const } },
        { sprStudentId: { contains: w, mode: 'insensitive' as const } },
        { division: { contains: w, mode: 'insensitive' as const } },
        { class: { name: { contains: w, mode: 'insensitive' as const } } },
        { school: { name: { contains: w, mode: 'insensitive' as const } } },
      ],
    }));

    const students = await prisma.student.findMany({
      where: {
        status: { not: 'INACTIVE' },
        AND: andConditions,
      },
      include: {
        class: true,
        school: true,
      },
      take: 25,
      orderBy: [
        { class: { numericGrade: 'asc' } },
        { fullName: 'asc' },
      ],
    });

    return NextResponse.json({
      students: students.map((s) => ({
        id: s.id,
        studentId: s.studentId,
        sprStudentId: s.sprStudentId,
        fullName: s.fullName,
        className: s.class?.name || '',
        schoolName: s.school?.name || '',
        division: s.division,
        photoUrl: s.photoUrl,
      })),
    });
  } catch (error: any) {
    console.error('Public search error:', error);
    return NextResponse.json({ error: 'Failed to search students.' }, { status: 500 });
  }
}

