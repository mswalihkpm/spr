export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth';
import { adminApproveTaskCompletion } from '@/lib/tasks';
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

    const pctRaw = body.percentage !== undefined ? body.percentage : body.approvedPercentage;
    const pct = pctRaw !== undefined ? parseFloat(pctRaw) : 100;
    const adminRemarks = body.adminRemarks || body.remarks;

    const result = await adminApproveTaskCompletion({
      taskId: params.id,
      studentId,
      percentage: pct,
      adminRemarks,
      adminId: user.id,
      adminEmail: user.email,
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({
      ...result,
      message: `Approved ${result.percentage}% completion for ${result.studentName}. Awarded ${result.awardedPoints} pts and ₹${result.awardedReward.toFixed(2)}.`,
    });
  } catch (error: any) {
    console.error('Approve task error:', error);
    return NextResponse.json({ error: error.message || 'Failed to approve task completion.' }, { status: 400 });
  }
}
