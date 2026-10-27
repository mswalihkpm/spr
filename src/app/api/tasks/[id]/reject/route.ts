export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth';
import { adminRejectTaskRecord } from '@/lib/tasks';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    let studentId = body.studentId;

    if (!studentId && body.studentTaskRecordId) {
      const rec = await prisma.studentTaskRecord.findUnique({
        where: { id: body.studentTaskRecordId },
        select: { studentId: true },
      });
      studentId = rec?.studentId;
    }

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required.' }, { status: 400 });
    }

    const remarks = body.remarks || body.adminRemarks;

    const record = await adminRejectTaskRecord({
      taskId: params.id,
      studentId,
      remarks,
      adminId: user.id,
      adminEmail: user.email,
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      record,
      message: 'Student task record marked as rejected.',
    });
  } catch (error: any) {
    console.error('Reject task error:', error);
    return NextResponse.json({ error: error.message || 'Failed to reject task report.' }, { status: 400 });
  }
}
