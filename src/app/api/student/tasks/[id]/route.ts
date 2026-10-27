export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateStudentRequest } from '@/lib/auth';
import { submitStudentTaskCompletion } from '@/lib/tasks';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { student, errorResponse } = await authenticateStudentRequest(req);
    if (errorResponse) return errorResponse;
    if (!student) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const result = await submitStudentTaskCompletion({
      taskId: params.id,
      studentId: student.studentId,
      notes: body.notes,
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Submit student task error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit task completion report.' }, { status: 400 });
  }
}
