export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth';
import { adminAddStudentToTask } from '@/lib/tasks';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('q') || searchParams.get('query') || '').trim();

    // Find students not already in this task
    const existingRecords = await prisma.studentTaskRecord.findMany({
      where: { taskId: params.id },
      select: { studentId: true },
    });
    const existingIds = existingRecords.map((r) => r.studentId);

    const candidates = await prisma.student.findMany({
      where: {
        id: { notIn: existingIds },
        status: 'ACTIVE',
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { sprStudentId: { contains: search, mode: 'insensitive' } },
                { studentId: { contains: search, mode: 'insensitive' } },
                { class: { name: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        sprStudentId: true,
        studentId: true,
        division: true,
        class: { select: { name: true } },
      },
      orderBy: { fullName: 'asc' },
      take: 50,
    });

    return NextResponse.json({
      candidates: candidates.map((c) => ({
        id: c.id,
        fullName: c.fullName,
        sprStudentId: c.sprStudentId,
        className: c.class?.name || '',
        division: c.division,
      })),
    });
  } catch (error: any) {
    console.error('Candidate students error:', error);
    return NextResponse.json({ error: error.message || 'Failed to search students.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    if (!body.studentId) {
      return NextResponse.json({ error: 'Student ID is required.' }, { status: 400 });
    }

    const record = await adminAddStudentToTask({
      taskId: params.id,
      studentId: body.studentId,
      adminId: user.id,
      adminEmail: user.email,
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      record,
      message: 'Student record added to task successfully.',
    });
  } catch (error: any) {
    console.error('Add student to task error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add student to task.' }, { status: 400 });
  }
}
