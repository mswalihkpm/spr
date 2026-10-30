export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth';
import { getAdminTaskDetail, validateTaskPayload } from '@/lib/tasks';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit';
import { invalidateEngineCache } from '@/lib/spr-engine';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const task = await getAdminTaskDetail(params.id);
    return NextResponse.json({ task });
  } catch (error: any) {
    console.error('Fetch task detail error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch task.' }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const existing = await prisma.task.findUnique({
      where: { id: params.id },
      include: { studentRecords: { where: { status: 'APPROVED' } } },
    });

    if (!existing) return NextResponse.json({ error: 'Task not found.' }, { status: 404 });

    const { start, end } = validateTaskPayload({
      title: body.title || existing.title,
      description: body.description || existing.description,
      maxPoints: body.maxPoints !== undefined ? parseFloat(body.maxPoints) : Number(existing.maxPoints),
      maxFund: body.maxFund !== undefined ? parseFloat(body.maxFund) : Number(existing.maxFund),
      startDate: body.startDate || existing.startDate.toISOString(),
      endDate: body.endDate || existing.endDate.toISOString(),
    });

    const updated = await prisma.task.update({
      where: { id: params.id },
      data: {
        title: body.title ? body.title.trim() : existing.title,
        description: body.description ? body.description.trim() : existing.description,
        maxPoints: body.maxPoints !== undefined ? parseFloat(body.maxPoints) : existing.maxPoints,
        maxFund: body.maxFund !== undefined ? parseFloat(body.maxFund) : existing.maxFund,
        startDate: start,
        endDate: end,
        status: body.status || existing.status,
      },
    });

    logAuditAction({
      userId: user.id,
      userName: user.email,
      action: 'TASK_EDITED',
      entity: 'Task',
      entityId: updated.id,
      previousValue: {
        title: existing.title,
        maxPoints: Number(existing.maxPoints),
        maxFund: Number(existing.maxFund),
        startDate: existing.startDate.toISOString(),
        endDate: existing.endDate.toISOString(),
      },
      newValue: {
        title: updated.title,
        maxPoints: Number(updated.maxPoints),
        maxFund: Number(updated.maxFund),
        startDate: updated.startDate.toISOString(),
        endDate: updated.endDate.toISOString(),
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    }).catch(() => {});

    invalidateEngineCache();

    return NextResponse.json({ success: true, task: updated });
  } catch (error: any) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update task.' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const existing = await prisma.task.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    // Safely delete associated ledgers, submissions, assignments and the task in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.taskPointsLedger.deleteMany({ where: { taskId: params.id } });
      await tx.taskRewardLedger.deleteMany({ where: { taskId: params.id } });
      await tx.studentTaskRecord.deleteMany({ where: { taskId: params.id } });
      await tx.taskAssignment.deleteMany({ where: { taskId: params.id } });
      await tx.task.delete({ where: { id: params.id } });
    });

    logAuditAction({
      userId: user.id,
      userName: user.email,
      action: 'TASK_DELETED',
      entity: 'Task',
      entityId: params.id,
      previousValue: {
        title: existing.title,
        maxPoints: Number(existing.maxPoints),
        maxFund: Number(existing.maxFund),
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    }).catch(() => {});

    invalidateEngineCache();

    return NextResponse.json({ success: true, message: 'Task deleted successfully.' });
  } catch (error: any) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete task.' }, { status: 400 });
  }
}
