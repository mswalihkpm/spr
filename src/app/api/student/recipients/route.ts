export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateStudentRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { student, errorResponse } = await authenticateStudentRequest(req);
    if (errorResponse) return errorResponse;
    if (!student) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q')?.trim() || '';

    const recipients = await prisma.student.findMany({
      where: {
        id: { not: student.studentId },
        status: 'ACTIVE',
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { sprStudentId: { contains: search, mode: 'insensitive' } },
                { studentId: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        sprStudentId: true,
        class: { select: { name: true } },
        division: true,
      },
      orderBy: { fullName: 'asc' },
      take: 50,
    });

    const formatted = recipients.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      sprStudentId: r.sprStudentId,
      className: r.class?.name || '',
      division: r.division,
    }));

    return NextResponse.json({ recipients: formatted });
  } catch (error: any) {
    console.error('Fetch recipients error:', error);
    return NextResponse.json({ error: 'Failed to search recipients.' }, { status: 500 });
  }
}
