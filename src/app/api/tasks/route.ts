export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth';
import { createTask, getAdminTasks, getAdminTaskOverviewMetrics } from '@/lib/tasks';
import { getCachedAcademicClasses } from '@/lib/academic-cache';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const filter = (searchParams.get('filter') || 'ALL') as any;

    const [tasks, classes, metrics] = await Promise.all([
      getAdminTasks(filter),
      getCachedAcademicClasses(),
      getAdminTaskOverviewMetrics(),
    ]);

    return NextResponse.json({ tasks, classes, metrics });
  } catch (error: any) {
    console.error('Fetch tasks error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch tasks.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const task = await createTask({
      title: body.title,
      description: body.description,
      instructions: body.instructions,
      maxPoints: parseFloat(body.maxPoints),
      maxFund: parseFloat(body.maxFund),
      startDate: body.startDate,
      endDate: body.endDate,
      targetAudience: body.targetAudience,
      targetAudienceJson: body.targetAudienceJson,
      targetClassId: body.targetClassId,
      assignedStudentIds: body.assignedStudentIds,
      rewardMode: body.rewardMode,
      rewardConfig: body.rewardConfig,
      closeWhenSlotsFilled: body.closeWhenSlotsFilled,
      winnerSlots: body.winnerSlots ? parseInt(body.winnerSlots, 10) : null,
      approvalMode: body.approvalMode,
      status: body.status,
      createdById: user.id,
      createdByEmail: user.email,
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      task,
      message: `Task "${task.title}" created successfully with ID ${task.taskId}.`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create task.' }, { status: 400 });
  }
}
