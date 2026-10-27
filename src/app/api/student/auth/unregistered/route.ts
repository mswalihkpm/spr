export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Find all active students whose account is either null or not yet activated
    const students = await prisma.student.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { account: null },
          { account: { isActivated: false } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        studentId: true,
        sprStudentId: true,
        division: true,
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const formatted = students.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      studentId: s.studentId,
      sprStudentId: s.sprStudentId,
      className: s.class?.name || '',
      division: s.division,
    }));

    return NextResponse.json({ students: formatted });
  } catch (error: any) {
    console.error('Error fetching unregistered students:', error);
    return NextResponse.json({ error: 'Failed to retrieve available students.' }, { status: 500 });
  }
}
