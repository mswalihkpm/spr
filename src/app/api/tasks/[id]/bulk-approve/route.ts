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
    let approvals = body.approvals;
    const percentage =
      body.percentage !== undefined
        ? parseFloat(body.percentage)
        : body.approvedPercentage !== undefined
        ? parseFloat(body.approvedPercentage)
        : 100;
    const adminRemarks = body.adminRemarks || body.remarks;

    if (!approvals && body.studentTaskRecordIds && Array.isArray(body.studentTaskRecordIds)) {
      const records = await prisma.studentTaskRecord.findMany({
        where: { id: { in: body.studentTaskRecordIds } },
        select: { studentId: true },
      });
      approvals = records.map((r) => r.studentId);
    }

    if (!approvals || !Array.isArray(approvals) || approvals.length === 0) {
      return NextResponse.json({ error: 'List of student approvals is required.' }, { status: 400 });
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const item of approvals) {
      const studentId = typeof item === 'string' ? item : item.studentId;
      const itemPercentage = typeof item === 'object' && item.percentage !== undefined ? item.percentage : percentage;
      const itemRemarks = typeof item === 'object' && item.adminRemarks ? item.adminRemarks : adminRemarks;

      try {
        const res = await adminApproveTaskCompletion({
          taskId: params.id,
          studentId,
          percentage: parseFloat(itemPercentage),
          adminRemarks: itemRemarks,
          adminId: user.id,
          adminEmail: user.email,
          ipAddress: req.headers.get('x-forwarded-for') || req.ip,
          userAgent: req.headers.get('user-agent'),
        });
        results.push({ studentId, ...res });
      } catch (err: any) {
        errors.push({ studentId, error: err.message || 'Approval failed' });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      totalProcessed: approvals.length,
      successCount: results.length,
      failureCount: errors.length,
      results,
      errors,
      message: `Successfully approved ${results.length} of ${approvals.length} student records.${errors.length > 0 ? ` ${errors.length} record(s) failed.` : ''}`,
    });
  } catch (error: any) {
    console.error('Bulk approve task error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process bulk approvals.' }, { status: 400 });
  }
}
