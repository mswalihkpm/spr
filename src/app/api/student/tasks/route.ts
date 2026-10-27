export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateStudentRequest } from '@/lib/auth';
import { getStudentTasks } from '@/lib/tasks';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { student, errorResponse } = await authenticateStudentRequest(req);
    if (errorResponse) return errorResponse;
    if (!student) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const studentRecord = await prisma.student.findUnique({
      where: { id: student.studentId },
      select: { classId: true },
    });

    if (!studentRecord) {
      return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
    }

    const { availableTasks, history } = await getStudentTasks(student.studentId, studentRecord.classId);

    return NextResponse.json({
      student,
      availableTasks,
      history,
    });
  } catch (error: any) {
    console.error('Fetch student tasks error:', error);
    return NextResponse.json({ error: error.message || 'Failed to load student tasks.' }, { status: 500 });
  }
}
