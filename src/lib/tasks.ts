import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { logAuditAction } from './audit';
import { invalidateEngineCache } from './spr-engine';

export const TIMEZONE = 'Asia/Kolkata';

/**
 * Returns current Date in Asia/Kolkata context.
 */
export function getNowInKolkata(): Date {
  return new Date();
}

/**
 * Parses an input date string (YYYY-MM-DD or ISO) into Start of Day in Asia/Kolkata (00:00:00.000).
 */
export function parseKolkataDateStart(dateStr: string): Date {
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    // Create Date at 00:00:00 UTC then adjust for IST (+05:30)
    // 00:00 IST is 18:30 UTC of previous day
    const utcDate = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
    // Offset by -5 hours 30 mins
    return new Date(utcDate.getTime() - (5.5 * 60 * 60 * 1000));
  }
  return new Date(dateStr);
}

/**
 * Parses an input date string (YYYY-MM-DD or ISO) into End of Day in Asia/Kolkata (23:59:59.999).
 */
export function parseKolkataDateEnd(dateStr: string): Date {
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    // 23:59:59.999 IST is 18:29:59.999 UTC of same day
    const utcDate = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
    return new Date(utcDate.getTime() - (5.5 * 60 * 60 * 1000));
  }
  return new Date(dateStr);
}

/**
 * Determines date-based availability for a task based on current time in IST.
 */
export function computeTaskDateStatus(startDate: Date, endDate: Date): 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' {
  const now = new Date();
  if (now < new Date(startDate)) {
    return 'SCHEDULED';
  }
  if (now > new Date(endDate)) {
    return 'EXPIRED';
  }
  return 'ACTIVE';
}

/**
 * Validates task creation/update payload.
 */
export function validateTaskPayload(data: {
  title?: string;
  description?: string;
  maxPoints?: number;
  maxFund?: number;
  startDate?: string;
  endDate?: string;
}) {
  if (!data.title || !data.title.trim()) {
    throw new Error('Task Title is required.');
  }
  if (!data.description || !data.description.trim()) {
    throw new Error('Task Description is required.');
  }
  if (data.maxPoints === undefined || data.maxPoints === null || isNaN(data.maxPoints) || data.maxPoints < 0) {
    throw new Error('Maximum Points must be a non-negative number.');
  }
  if (data.maxFund === undefined || data.maxFund === null || isNaN(data.maxFund) || data.maxFund < 0) {
    throw new Error('Maximum Monetary Reward (Fund) must be a non-negative INR amount.');
  }
  if (!data.startDate) {
    throw new Error('Start Date is mandatory.');
  }
  if (!data.endDate) {
    throw new Error('End Date is mandatory.');
  }

  const start = parseKolkataDateStart(data.startDate);
  const end = parseKolkataDateEnd(data.endDate);

  if (end < start) {
    throw new Error('End Date cannot be earlier than Start Date.');
  }

  return { start, end };
}

/**
 * Generates next sequential human-friendly Task ID (e.g. TSK-2026-001).
 */
export async function generateTaskId(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.task.count();
  const seq = String(count + 1).padStart(3, '0');
  const candidate = `TSK-${year}-${seq}`;
  const existing = await prisma.task.findUnique({ where: { taskId: candidate } });
  if (existing) {
    return `TSK-${year}-${seq}-${Date.now().toString().slice(-4)}`;
  }
  return candidate;
}

/**
 * Admin: Create a new Task.
 */
export async function createTask(params: {
  title: string;
  description: string;
  instructions?: string;
  maxPoints: number;
  maxFund: number;
  startDate: string;
  endDate: string;
  targetAudience?: 'ALL' | 'SPECIFIC_CLASS' | 'SPECIFIC_STUDENTS' | 'QUESTIONNAIRE_GROUP';
  targetAudienceJson?: any;
  targetClassId?: string | null;
  assignedStudentIds?: string[];
  rewardMode?: 'EQUAL' | 'RANK_BASED' | 'TIME_BASED' | 'COMBINED';
  rewardConfig?: any;
  closeWhenSlotsFilled?: boolean;
  winnerSlots?: number | null;
  approvalMode?: 'ADMIN_APPROVAL' | 'AUTO_APPROVAL';
  status?: 'DRAFT' | 'PUBLISHED';
  createdById: string;
  createdByEmail: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const { start, end } = validateTaskPayload(params);
  const humanTaskId = await generateTaskId();

  const task = await prisma.task.create({
    data: {
      taskId: humanTaskId,
      title: params.title.trim(),
      description: params.description.trim(),
      instructions: params.instructions ? params.instructions.trim() : null,
      maxPoints: new Prisma.Decimal(params.maxPoints),
      maxFund: new Prisma.Decimal(params.maxFund),
      startDate: start,
      endDate: end,
      status: params.status || 'PUBLISHED',
      targetAudience: params.targetAudience || 'ALL',
      targetAudienceJson: params.targetAudienceJson || undefined,
      rewardMode: params.rewardMode || 'EQUAL',
      rewardConfig: params.rewardConfig || undefined,
      closeWhenSlotsFilled: Boolean(params.closeWhenSlotsFilled),
      winnerSlots: params.winnerSlots !== undefined && params.winnerSlots !== null ? Number(params.winnerSlots) : null,
      approvalMode: params.approvalMode || 'ADMIN_APPROVAL',
      targetClassId: params.targetAudience === 'SPECIFIC_CLASS' ? params.targetClassId : null,
      createdById: params.createdById,
    },
  });

  // Target Audience Resolution Snapshot
  let resolvedStudentIds: string[] = [];

  if (params.targetAudience === 'SPECIFIC_STUDENTS' && params.assignedStudentIds && params.assignedStudentIds.length > 0) {
    resolvedStudentIds = params.assignedStudentIds;
  } else if (params.targetAudience === 'SPECIFIC_CLASS') {
    const classIds = params.targetAudienceJson?.classIds || (params.targetClassId ? [params.targetClassId] : []);
    if (classIds.length > 0) {
      const classStudents = await prisma.student.findMany({
        where: { classId: { in: classIds } },
        select: { id: true },
      });
      resolvedStudentIds = classStudents.map((s) => s.id);
    }
  } else if (params.targetAudience === 'QUESTIONNAIRE_GROUP') {
    const templateId = params.targetAudienceJson?.templateId;
    const keywords: string[] = params.targetAudienceJson?.optionKeywords || [];
    const matchSet = new Set<string>();

    if (templateId) {
      const template = await prisma.studentBriefNoteTemplate.findUnique({
        where: { id: templateId },
      });
      if (template) {
        const rawSections = (template.sections as any[]) || [];
        const questionIds = rawSections.flatMap((s) => (s.fields || []).map((f: any) => f.questionId));
        const responses = await prisma.questionnaireResponse.findMany({
          select: { studentId: true, answers: true },
        });
        for (const r of responses) {
          if (!r.answers || typeof r.answers !== 'object') continue;
          const ansKeys = Object.keys(r.answers as object);
          const hasField = questionIds.some((qid) => ansKeys.includes(qid));
          const hasKeywordMatch = keywords.length > 0 && keywords.some((k) => JSON.stringify(r.answers).toLowerCase().includes(k.toLowerCase()));
          if (hasField || hasKeywordMatch || questionIds.length === 0) {
            matchSet.add(r.studentId);
          }
        }
      }
    } else if (keywords.length > 0) {
      const responses = await prisma.questionnaireResponse.findMany({
        where: { status: 'SUBMITTED' },
        select: { studentId: true, answers: true },
      });
      for (const r of responses) {
        if (!r.answers || typeof r.answers !== 'object') continue;
        const valuesStr = JSON.stringify(r.answers).toLowerCase();
        const hasMatch = keywords.some((k) => valuesStr.includes(k.toLowerCase()));
        if (hasMatch) {
          matchSet.add(r.studentId);
        }
      }
    }

    resolvedStudentIds = Array.from(matchSet);
    // If no specific questionnaire responses matched, ensure enrolled students exist by falling back to active students
    if (resolvedStudentIds.length === 0) {
      const activeStudents = await prisma.student.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
      resolvedStudentIds = activeStudents.map((s) => s.id);
    }
  }

  // Deduplicate and persist task assignments snapshot
  if (resolvedStudentIds.length > 0) {
    const uniqueIds = Array.from(new Set(resolvedStudentIds));
    await prisma.taskAssignment.createMany({
      data: uniqueIds.map((studentId) => ({
        taskId: task.id,
        studentId,
      })),
      skipDuplicates: true,
    });
  }

  logAuditAction({
    userId: params.createdById,
    userName: params.createdByEmail,
    action: 'TASK_CREATED',
    entity: 'Task',
    entityId: task.id,
    newValue: {
      taskId: task.taskId,
      title: task.title,
      maxPoints: params.maxPoints,
      maxFund: params.maxFund,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      audience: params.targetAudience,
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  }).catch(() => {});

  return task;
}

/**
 * Admin: Get all tasks with summaries.
 */
export async function getAdminTasks(filter?: 'ALL' | 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'DRAFT') {
  const tasks = await prisma.task.findMany({
    select: {
      id: true,
      taskId: true,
      title: true,
      description: true,
      maxPoints: true,
      maxFund: true,
      startDate: true,
      endDate: true,
      status: true,
      targetAudience: true,
      targetAudienceJson: true,
      rewardMode: true,
      winnerSlots: true,
      closeWhenSlotsFilled: true,
      createdAt: true,
      targetClass: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
      studentRecords: {
        select: {
          id: true,
          status: true,
          awardedPoints: true,
          awardedAmount: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return tasks
    .map((t) => {
      const dateStatus = computeTaskDateStatus(t.startDate, t.endDate);
      const studentCount = t.studentRecords.length;
      const pendingReviews = t.studentRecords.filter((r) => r.status === 'UNDER_REVIEW' || r.status === 'SUBMITTED').length;
      const approvedCount = t.studentRecords.filter((r) => r.status === 'APPROVED').length;
      const totalPointsAwarded = t.studentRecords.reduce((acc, r) => acc + Number(r.awardedPoints), 0);
      const totalRewardsIssued = t.studentRecords.reduce((acc, r) => acc + Number(r.awardedAmount), 0);

      return {
        id: t.id,
        taskId: t.taskId,
        title: t.title,
        description: t.description,
        maxPoints: Number(t.maxPoints),
        maxFund: Number(t.maxFund),
        startDate: t.startDate.toISOString(),
        endDate: t.endDate.toISOString(),
        publicationStatus: t.status,
        dateStatus,
        targetAudience: t.targetAudience,
        targetAudienceJson: t.targetAudienceJson,
        rewardMode: t.rewardMode || 'EQUAL',
        winnerSlots: t.winnerSlots,
        closeWhenSlotsFilled: t.closeWhenSlotsFilled,
        targetClassName: t.targetClass?.name || null,
        createdByName: t.createdBy.name,
        createdAt: t.createdAt.toISOString(),
        studentCount,
        pendingReviews,
        approvedCount,
        totalPointsAwarded,
        totalRewardsIssued,
      };
    })
    .filter((t) => {
      if (!filter || filter === 'ALL') return true;
      if (filter === 'DRAFT') return t.publicationStatus === 'DRAFT';
      if (filter === 'ACTIVE') return t.publicationStatus === 'PUBLISHED' && t.dateStatus === 'ACTIVE';
      if (filter === 'SCHEDULED') return t.publicationStatus === 'PUBLISHED' && t.dateStatus === 'SCHEDULED';
      if (filter === 'EXPIRED') return t.dateStatus === 'EXPIRED';
      return true;
    });
}

/**
 * 13 Database-Driven Admin Overview Metrics
 */
export async function getAdminTaskOverviewMetrics() {
  const now = new Date();
  const allTasks = await prisma.task.findMany({
    select: {
      id: true,
      startDate: true,
      endDate: true,
      status: true,
      closeWhenSlotsFilled: true,
      winnerSlots: true,
      studentRecords: {
        select: {
          id: true,
          status: true,
          awardedPoints: true,
          awardedAmount: true,
        },
      },
      assignments: {
        select: { id: true },
      },
    },
  });

  const totalTasks = allTasks.length;
  const draftTasks = allTasks.filter((t) => t.status === 'DRAFT').length;
  const scheduledTasks = allTasks.filter((t) => t.status === 'PUBLISHED' && new Date(t.startDate) > now).length;
  const activeTasks = allTasks.filter(
    (t) => t.status === 'PUBLISHED' && new Date(t.startDate) <= now && new Date(t.endDate) >= now
  ).length;
  const closedTasks = allTasks.filter((t) => t.status === 'ARCHIVED' || new Date(t.endDate) < now).length;
  const completedTasks = allTasks.filter((t) => {
    if (t.studentRecords.length === 0) return false;
    const hasApprovedOrRejected = t.studentRecords.every(
      (r) => r.status === 'APPROVED' || r.status === 'REJECTED' || r.status === 'COMPLETED'
    );
    const slotsFilled =
      t.closeWhenSlotsFilled &&
      t.winnerSlots &&
      t.studentRecords.filter((r) => r.status === 'APPROVED').length >= t.winnerSlots;
    return hasApprovedOrRejected || Boolean(slotsFilled);
  }).length;

  let totalAssignedStudents = 0;
  let totalSubmissions = 0;
  let pendingReviews = 0;
  let approvedSubmissions = 0;
  let rejectedSubmissions = 0;
  let totalPointsDistributed = 0;
  let totalCashDistributed = 0;

  for (const t of allTasks) {
    totalAssignedStudents += Math.max(t.assignments.length, t.studentRecords.length);
    for (const r of t.studentRecords) {
      if (r.status !== 'AVAILABLE') {
        totalSubmissions++;
      }
      if (r.status === 'UNDER_REVIEW' || r.status === 'SUBMITTED') {
        pendingReviews++;
      }
      if (r.status === 'APPROVED' || r.status === 'COMPLETED') {
        approvedSubmissions++;
        totalPointsDistributed += Number(r.awardedPoints) || 0;
        totalCashDistributed += Number(r.awardedAmount) || 0;
      }
      if (r.status === 'REJECTED') {
        rejectedSubmissions++;
      }
    }
  }

  return {
    totalTasks,
    draftTasks,
    scheduledTasks,
    activeTasks,
    completedTasks,
    closedTasks,
    totalAssignedStudents,
    totalSubmissions,
    pendingReviews,
    approvedSubmissions,
    rejectedSubmissions,
    totalPointsDistributed: Number(totalPointsDistributed.toFixed(2)),
    totalCashDistributed: Number(totalCashDistributed.toFixed(2)),
  };
}

/**
 * Admin: Get detailed task view with student records.
 * Accessible even after expiry!
 */
export async function getAdminTaskDetail(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      targetClass: true,
      createdBy: { select: { id: true, name: true, email: true } },
      assignments: {
        include: {
          student: {
            select: { id: true, fullName: true, sprStudentId: true, class: { select: { name: true } }, division: true },
          },
        },
      },
      studentRecords: {
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              sprStudentId: true,
              studentId: true,
              class: { select: { name: true } },
              division: true,
            },
          },
          approvedBy: { select: { name: true, email: true } },
        },
        orderBy: { updatedAt: 'desc' },
      },
      rewardLedgers: {
        include: {
          student: { select: { fullName: true, sprStudentId: true } },
        },
        orderBy: { approvedAt: 'desc' },
      },
    },
  });

  if (!task) throw new Error('Task not found.');

  const dateStatus = computeTaskDateStatus(task.startDate, task.endDate);

  return {
    ...task,
    maxPoints: Number(task.maxPoints),
    maxFund: Number(task.maxFund),
    dateStatus,
    studentRecords: task.studentRecords.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      fullName: r.student.fullName,
      studentName: r.student.fullName,
      sprStudentId: r.student.sprStudentId,
      studentCode: r.student.studentId,
      className: r.student.class?.name || '',
      division: r.student.division,
      status: r.status,
      submissionNotes: r.submissionNotes,
      submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
      approvedPercentage: r.approvedPercentage ? Number(r.approvedPercentage) : null,
      awardedPoints: Number(r.awardedPoints),
      awardedAmount: Number(r.awardedAmount),
      approvedByName: r.approvedBy?.name || null,
      approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
      adminRemarks: r.adminRemarks,
    })),
    rewardLedgers: task.rewardLedgers.map((l) => ({
      id: l.id,
      studentName: l.student.fullName,
      sprStudentId: l.student.sprStudentId,
      amount: Number(l.amount),
      transactionReference: l.transactionReference,
      approvedAt: l.approvedAt.toISOString(),
    })),
  };
}

/**
 * Student: Get available tasks for the logged in student.
 * Only returns PUBLISHED tasks where startDate <= now <= endDate.
 */
export async function getStudentTasks(studentId: string, classId: string) {
  const now = new Date();

  // Run eligible tasks, current records, and history queries in parallel with explicit select
  const [eligibleTasks, studentRecords, historyRecords] = await Promise.all([
    prisma.task.findMany({
      where: {
        status: 'PUBLISHED',
        startDate: { lte: now },
        endDate: { gte: now },
        OR: [
          { targetAudience: 'ALL' },
          { targetAudience: 'SPECIFIC_CLASS', targetClassId: classId },
          { assignments: { some: { studentId } } },
        ],
      },
      select: {
        id: true,
        taskId: true,
        title: true,
        description: true,
        instructions: true,
        maxPoints: true,
        maxFund: true,
        startDate: true,
        endDate: true,
        rewardMode: true,
        rewardConfig: true,
        winnerSlots: true,
        closeWhenSlotsFilled: true,
        submissionType: true,
        studentRecords: {
          select: {
            id: true,
            studentId: true,
            status: true,
            submittedAt: true,
            approvedPercentage: true,
            awardedPoints: true,
            awardedAmount: true,
            student: {
              select: {
                id: true,
                fullName: true,
                sprStudentId: true,
              },
            },
          },
          orderBy: { submittedAt: 'asc' },
        },
      },
      orderBy: { endDate: 'asc' },
    }),
    prisma.studentTaskRecord.findMany({
      where: { studentId },
      select: {
        id: true,
        taskId: true,
        status: true,
        submissionNotes: true,
        submittedAt: true,
        approvedPercentage: true,
        awardedPoints: true,
        awardedAmount: true,
      },
    }),
    prisma.studentTaskRecord.findMany({
      where: {
        studentId,
        status: { in: ['APPROVED', 'COMPLETED', 'REJECTED'] },
      },
      select: {
        id: true,
        status: true,
        approvedPercentage: true,
        awardedPoints: true,
        awardedAmount: true,
        approvedAt: true,
        updatedAt: true,
        task: {
          select: {
            id: true,
            taskId: true,
            title: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const recordByTaskId = new Map(studentRecords.map((r) => [r.taskId, r]));

  const availableTasks = eligibleTasks.map((t) => {
    const record = recordByTaskId.get(t.id);

    // Compute real-time submission tracking and telemetry
    const allTaskSubmissions = (t.studentRecords || [])
      .filter((r) => r.submittedAt !== null && r.status !== 'AVAILABLE' && r.status !== 'NOT_STARTED')
      .sort((a, b) => new Date(a.submittedAt!).getTime() - new Date(b.submittedAt!).getTime());

    const totalSubmissions = allTaskSubmissions.length;
    const approvedSubmissions = (t.studentRecords || []).filter(
      (r) => r.status === 'APPROVED' || r.status === 'COMPLETED'
    );
    const slotsOccupied = approvedSubmissions.length;
    const winnerSlots = t.winnerSlots !== null && t.winnerSlots !== undefined ? Number(t.winnerSlots) : null;
    const slotsRemaining = winnerSlots !== null ? Math.max(0, winnerSlots - slotsOccupied) : null;
    const slotsPercentFilled = winnerSlots ? Math.min(100, Math.round((slotsOccupied / winnerSlots) * 100)) : 0;

    // Current student's submission standing
    const mySubIndex = allTaskSubmissions.findIndex((r) => r.studentId === studentId);
    const myPosition = mySubIndex >= 0 ? mySubIndex + 1 : null;
    const mySubRecord = mySubIndex >= 0 ? allTaskSubmissions[mySubIndex] : null;

    // Leaderboard of first submissions
    const leaderboard = allTaskSubmissions.slice(0, 10).map((r, idx) => ({
      rank: idx + 1,
      studentId: r.studentId,
      studentName: r.student?.fullName || 'Student',
      sprStudentId: r.student?.sprStudentId || '',
      submittedAt: r.submittedAt ? r.submittedAt.toISOString() : '',
      status: r.status,
      awardedPoints: Number(r.awardedPoints) || 0,
      awardedAmount: Number(r.awardedAmount) || 0,
      isCurrentStudent: r.studentId === studentId,
    }));

    // Parse reward config
    const rawConfig = typeof t.rewardConfig === 'string' ? JSON.parse(t.rewardConfig) : (t.rewardConfig || {});
    const tiers: Array<{ rank: number; points: number; cash: number }> = Array.isArray(rawConfig.tiers)
      ? rawConfig.tiers
      : [];

    // Calculate time elapsed / remaining for Time-Based early submission bonuses
    const startMs = new Date(t.startDate).getTime();
    const endMs = new Date(t.endDate).getTime();
    const durationMs = Math.max(1, endMs - startMs);
    const elapsedMs = Math.max(0, now.getTime() - startMs);
    const remainingMs = Math.max(0, endMs - now.getTime());
    const hoursRemaining = Math.max(0, Math.round(remainingMs / (1000 * 60 * 60)));

    // Early bird bonus threshold: first 25% of task window (or at least 24 hours if duration is multi-day)
    const earlyBirdWindowMs = Math.min(durationMs * 0.25, 24 * 60 * 60 * 1000);
    const isEarlyBirdActive = elapsedMs <= earlyBirdWindowMs;
    const earlyBirdHoursLeft = Math.max(0, Math.round((earlyBirdWindowMs - elapsedMs) / (1000 * 60 * 60)));

    // Base amounts
    const basePts = Number(t.maxPoints);
    const baseFund = Number(t.maxFund);

    // Estimated Reward calculation
    let estimatedReward: {
      tierRank?: number;
      points: number;
      cash: number;
      tierName?: string;
      speedBonusMultiplier?: number;
      bonusLabel?: string;
      notes?: string;
    } | null = null;

    let nextPotentialReward: {
      tierRank: number;
      points: number;
      cash: number;
      speedBonusMultiplier?: number;
    } | null = null;

    if (t.rewardMode === 'RANK_BASED') {
      if (myPosition) {
        const tier = tiers.find((tr) => tr.rank === myPosition) || (tiers.length > 0 ? tiers[tiers.length - 1] : { rank: myPosition, points: basePts, cash: baseFund });
        estimatedReward = {
          tierRank: myPosition,
          points: Number(tier.points),
          cash: Number(tier.cash),
          tierName: `Rank #${myPosition} Tier Reward`,
        };
      }
      const nextRank = totalSubmissions + 1;
      const nextTier = tiers.find((tr) => tr.rank === nextRank) || (tiers.length > 0 ? tiers[tiers.length - 1] : { rank: nextRank, points: basePts, cash: baseFund });
      nextPotentialReward = {
        tierRank: nextRank,
        points: Number(nextTier.points),
        cash: Number(nextTier.cash),
      };
    } else if (t.rewardMode === 'TIME_BASED') {
      let mult = isEarlyBirdActive ? 1.5 : 1.0;
      if (mySubRecord?.submittedAt) {
        const subElapsed = new Date(mySubRecord.submittedAt).getTime() - startMs;
        mult = subElapsed <= earlyBirdWindowMs ? 1.5 : 1.0;
      }
      estimatedReward = {
        points: Math.round(basePts * mult),
        cash: Math.round((baseFund * mult + Number.EPSILON) * 100) / 100,
        speedBonusMultiplier: mult,
        bonusLabel: mult > 1 ? '+50% Early Bird Bonus' : 'Standard Rate',
        notes: mult > 1 ? 'Early submission speed bonus applied' : 'Standard submission rate',
      };
      nextPotentialReward = {
        tierRank: totalSubmissions + 1,
        points: Math.round(basePts * (isEarlyBirdActive ? 1.5 : 1.0)),
        cash: Math.round(((baseFund * (isEarlyBirdActive ? 1.5 : 1.0)) + Number.EPSILON) * 100) / 100,
        speedBonusMultiplier: isEarlyBirdActive ? 1.5 : 1.0,
      };
    } else if (t.rewardMode === 'COMBINED') {
      const pos = myPosition || (totalSubmissions + 1);
      const tier = tiers.find((tr) => tr.rank === pos) || (tiers.length > 0 ? tiers[tiers.length - 1] : { rank: pos, points: basePts, cash: baseFund });
      let mult = isEarlyBirdActive ? 1.25 : 1.0;
      if (mySubRecord?.submittedAt) {
        const subElapsed = new Date(mySubRecord.submittedAt).getTime() - startMs;
        mult = subElapsed <= earlyBirdWindowMs ? 1.25 : 1.0;
      }
      estimatedReward = {
        tierRank: pos,
        points: Math.round(Number(tier.points) * mult),
        cash: Math.round((Number(tier.cash) * mult + Number.EPSILON) * 100) / 100,
        speedBonusMultiplier: mult,
        bonusLabel: mult > 1 ? `Rank #${pos} + 25% Speed Boost` : `Rank #${pos} Standard`,
        notes: `Combined Rank #${pos} Tier with ${mult}x speed multiplier`,
      };
      const nextRank = totalSubmissions + 1;
      const nextTier = tiers.find((tr) => tr.rank === nextRank) || (tiers.length > 0 ? tiers[tiers.length - 1] : { rank: nextRank, points: basePts, cash: baseFund });
      const nextMult = isEarlyBirdActive ? 1.25 : 1.0;
      nextPotentialReward = {
        tierRank: nextRank,
        points: Math.round(Number(nextTier.points) * nextMult),
        cash: Math.round((Number(nextTier.cash) * nextMult + Number.EPSILON) * 100) / 100,
        speedBonusMultiplier: nextMult,
      };
    }

    // Reward tiers list with claiming status
    const rewardTiers = tiers.map((tr) => {
      const claimer = allTaskSubmissions[tr.rank - 1];
      return {
        rank: tr.rank,
        points: Number(tr.points),
        cash: Number(tr.cash),
        claimedBy: claimer ? claimer.student?.fullName : null,
        claimedSprId: claimer ? claimer.student?.sprStudentId : null,
        status: claimer ? ('CLAIMED' as const) : ('AVAILABLE' as const),
      };
    });

    // Submission eligibility determination
    let canSubmit = true;
    let eligibilityReason = 'Eligible to submit completion report.';
    if (record && (record.status === 'SUBMITTED' || record.status === 'UNDER_REVIEW')) {
      canSubmit = false;
      eligibilityReason = 'You have already submitted this task and it is currently under review.';
    } else if (record && (record.status === 'APPROVED' || record.status === 'COMPLETED')) {
      canSubmit = false;
      eligibilityReason = 'Your submission has already been approved and rewarded.';
    } else if (t.closeWhenSlotsFilled && winnerSlots && slotsOccupied >= winnerSlots) {
      canSubmit = false;
      eligibilityReason = `All ${winnerSlots} reward slots have been occupied. Submissions are closed.`;
    } else if (now > new Date(t.endDate)) {
      canSubmit = false;
      eligibilityReason = 'Task deadline has expired.';
    } else if (now < new Date(t.startDate)) {
      canSubmit = false;
      eligibilityReason = 'Task has not started yet.';
    }

    return {
      id: t.id,
      taskId: t.taskId,
      title: t.title,
      description: t.description,
      instructions: t.instructions,
      rewardMode: t.rewardMode || 'EQUAL',
      rewardConfig: t.rewardConfig,
      winnerSlots: t.winnerSlots,
      closeWhenSlotsFilled: t.closeWhenSlotsFilled,
      submissionType: t.submissionType,
      maxPoints: Number(t.maxPoints),
      maxFund: Number(t.maxFund),
      startDate: t.startDate.toISOString(),
      endDate: t.endDate.toISOString(),
      status: record ? record.status : 'AVAILABLE',
      recordId: record?.id || null,
      submissionNotes: record?.submissionNotes || null,
      submittedAt: record?.submittedAt ? record.submittedAt.toISOString() : null,
      approvedPercentage: record?.approvedPercentage ? Number(record.approvedPercentage) : null,
      awardedPoints: record ? Number(record.awardedPoints) : 0,
      awardedAmount: record ? Number(record.awardedAmount) : 0,
      telemetry: {
        rewardMode: t.rewardMode || 'EQUAL',
        totalSubmissions,
        slotsOccupied,
        winnerSlots,
        slotsRemaining,
        slotsPercentFilled,
        myPosition,
        mySubmissionTime: mySubRecord?.submittedAt ? mySubRecord.submittedAt.toISOString() : null,
        estimatedReward,
        nextPotentialReward,
        leaderboard,
        rewardTiers,
        timeBonusInfo: {
          isEarlyBirdActive,
          earlyBirdHoursLeft,
          hoursRemaining,
        },
        eligibility: {
          canSubmit,
          reason: eligibilityReason,
        },
      },
    };
  });

  const history = historyRecords.map((r) => ({
    recordId: r.id,
    taskId: r.task.id,
    taskCode: r.task.taskId,
    title: r.task.title,
    status: r.status,
    approvedPercentage: r.approvedPercentage ? Number(r.approvedPercentage) : null,
    awardedPoints: Number(r.awardedPoints),
    awardedAmount: Number(r.awardedAmount),
    approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
    completedDate: r.updatedAt.toISOString(),
  }));

  return {
    availableTasks,
    history,
  };
}

/**
 * Student: Report completion of a task.
 * Validates date eligibility (must be <= endDate in Asia/Kolkata).
 */
export async function submitStudentTaskCompletion(params: {
  taskId: string;
  studentId: string;
  notes?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const { taskId, studentId, notes, ipAddress, userAgent } = params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) throw new Error('Task not found.');

  // Date check: rejected after expiry
  const now = new Date();
  if (now > task.endDate) {
    throw new Error(`This task expired on ${task.endDate.toLocaleDateString('en-IN', { timeZone: TIMEZONE })}. Student submissions are closed.`);
  }
  if (now < task.startDate) {
    throw new Error('This task has not started yet.');
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, fullName: true, sprStudentId: true },
  });
  if (!student) throw new Error('Student record not found.');

  const record = await prisma.studentTaskRecord.upsert({
    where: {
      taskId_studentId: {
        taskId,
        studentId,
      },
    },
    update: {
      status: 'UNDER_REVIEW',
      submissionNotes: notes || 'Student reported completion',
      submittedAt: new Date(),
    },
    create: {
      taskId,
      studentId,
      status: 'UNDER_REVIEW',
      submissionNotes: notes || 'Student reported completion',
      submittedAt: new Date(),
    },
  });

  logAuditAction({
    userName: student.fullName,
    action: 'TASK_COMPLETION_REPORTED',
    entity: 'StudentTaskRecord',
    entityId: record.id,
    newValue: {
      taskId,
      taskTitle: task.title,
      notes,
    },
    ipAddress,
    userAgent,
  }).catch(() => {});

  return {
    success: true,
    recordId: record.id,
    status: record.status,
    message: 'Task completion report submitted successfully and awaits administrator review.',
  };
}

/**
 * Admin: Add a student record to a task manually.
 * Accessible even after task expiry!
 */
export async function adminAddStudentToTask(params: {
  taskId: string;
  studentId: string;
  adminId: string;
  adminEmail: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const { taskId, studentId, adminId, adminEmail, ipAddress, userAgent } = params;

  const [task, student] = await Promise.all([
    prisma.task.findUnique({ where: { id: taskId } }),
    prisma.student.findUnique({ where: { id: studentId } }),
  ]);

  if (!task) throw new Error('Task not found.');
  if (!student) throw new Error('Student not found.');

  const record = await prisma.studentTaskRecord.upsert({
    where: {
      taskId_studentId: {
        taskId,
        studentId,
      },
    },
    update: {},
    create: {
      taskId,
      studentId,
      status: 'NOT_STARTED',
    },
  });

  logAuditAction({
    userId: adminId,
    userName: adminEmail,
    action: 'TASK_STUDENT_ADDED',
    entity: 'StudentTaskRecord',
    entityId: record.id,
    newValue: {
      taskId,
      studentId,
      studentName: student.fullName,
      postExpiry: new Date() > task.endDate,
    },
    ipAddress,
    userAgent,
  }).catch(() => {});

  return record;
}

/**
 * Admin: Approve a student's task completion (100% or Custom Percentage 0-100%).
 * Accessible even after task expiry!
 * Atomically computes points, monetary reward, credits wallet, creates ledgers, and logs audit.
 * Idempotent with duplicate-reward protection.
 */
export async function adminApproveTaskCompletion(params: {
  taskId?: string;
  studentId?: string;
  studentTaskRecordId?: string;
  percentage?: number; // 0 to 100
  approvedPercentage?: number;
  adminRemarks?: string;
  adminId: string;
  adminEmail: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  let { taskId, studentId, adminRemarks, adminId, adminEmail, ipAddress, userAgent } = params;
  const percentage = params.percentage !== undefined ? params.percentage : params.approvedPercentage;

  if (params.studentTaskRecordId && (!taskId || !studentId)) {
    const rec = await prisma.studentTaskRecord.findUnique({
      where: { id: params.studentTaskRecordId },
    });
    if (!rec) throw new Error('Student task record not found.');
    taskId = rec.taskId;
    studentId = rec.studentId;
  }

  if (!taskId || !studentId) {
    throw new Error('Both taskId and studentId (or valid studentTaskRecordId) are required.');
  }

  if (percentage === undefined || percentage === null || isNaN(percentage) || percentage < 0 || percentage > 100) {
    throw new Error('Approved percentage must be a number between 0 and 100.');
  }

  const [task, student] = await Promise.all([
    prisma.task.findUnique({ where: { id: taskId } }),
    prisma.student.findUnique({
      where: { id: studentId },
      include: { wallet: true },
    }),
  ]);

  if (!task) throw new Error('Task not found.');
  if (!student) throw new Error('Student record not found.');

  // Dynamic reward mode resolution:
  let baseTargetPoints = Number(task.maxPoints);
  let baseTargetFund = Number(task.maxFund);

  const rawConfig = typeof task.rewardConfig === 'string' ? JSON.parse(task.rewardConfig) : (task.rewardConfig || {});
  const tiers: Array<{ rank: number; points: number; cash: number }> = Array.isArray(rawConfig.tiers) ? rawConfig.tiers : [];

  if (task.rewardMode === 'RANK_BASED' && tiers.length > 0) {
    const existingRec = await prisma.studentTaskRecord.findUnique({
      where: { taskId_studentId: { taskId, studentId } },
    });
    const subTime = existingRec?.submittedAt || new Date();
    const earlierSubmissionsCount = await prisma.studentTaskRecord.count({
      where: {
        taskId,
        studentId: { not: studentId },
        submittedAt: { lt: subTime },
        status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'COMPLETED'] },
      },
    });
    const subRank = earlierSubmissionsCount + 1;
    const tier = tiers.find((tr) => tr.rank === subRank) || tiers[tiers.length - 1];
    if (tier) {
      baseTargetPoints = Number(tier.points);
      baseTargetFund = Number(tier.cash);
    }
  } else if (task.rewardMode === 'TIME_BASED') {
    const existingRec = await prisma.studentTaskRecord.findUnique({
      where: { taskId_studentId: { taskId, studentId } },
    });
    const submissionTime = existingRec?.submittedAt || new Date();
    const startMs = new Date(task.startDate).getTime();
    const durationMs = Math.max(1, new Date(task.endDate).getTime() - startMs);
    const earlyBirdWindowMs = Math.min(durationMs * 0.25, 24 * 60 * 60 * 1000);
    const subElapsed = new Date(submissionTime).getTime() - startMs;
    const mult = subElapsed <= earlyBirdWindowMs ? 1.5 : 1.0;
    baseTargetPoints = Math.round(baseTargetPoints * mult);
    baseTargetFund = Math.round((baseTargetFund * mult + Number.EPSILON) * 100) / 100;
  } else if (task.rewardMode === 'COMBINED') {
    const existingRec = await prisma.studentTaskRecord.findUnique({
      where: { taskId_studentId: { taskId, studentId } },
    });
    const subTime = existingRec?.submittedAt || new Date();
    const earlierSubmissionsCount = await prisma.studentTaskRecord.count({
      where: {
        taskId,
        studentId: { not: studentId },
        submittedAt: { lt: subTime },
        status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'COMPLETED'] },
      },
    });
    const subRank = earlierSubmissionsCount + 1;
    const tier = tiers.find((tr) => tr.rank === subRank) || (tiers.length > 0 ? tiers[tiers.length - 1] : null);
    if (tier) {
      baseTargetPoints = Number(tier.points);
      baseTargetFund = Number(tier.cash);
    }
    const startMs = new Date(task.startDate).getTime();
    const durationMs = Math.max(1, new Date(task.endDate).getTime() - startMs);
    const earlyBirdWindowMs = Math.min(durationMs * 0.25, 24 * 60 * 60 * 1000);
    const subElapsed = new Date(subTime).getTime() - startMs;
    const mult = subElapsed <= earlyBirdWindowMs ? 1.25 : 1.0;
    baseTargetPoints = Math.round(baseTargetPoints * mult);
    baseTargetFund = Math.round((baseTargetFund * mult + Number.EPSILON) * 100) / 100;
  }

  // Exact calculations:
  // Awarded Points = Base Target Points * Approved Percentage / 100
  // Monetary Reward = Base Target Fund * Approved Percentage / 100
  const rawPoints = (baseTargetPoints * percentage) / 100;
  const rawReward = (baseTargetFund * percentage) / 100;

  const awardedPoints = Math.round((rawPoints + Number.EPSILON) * 100) / 100;
  const awardedReward = Math.round((rawReward + Number.EPSILON) * 100) / 100;

  const rewardDecimal = new Prisma.Decimal(awardedReward);
  const pointsDecimal = new Prisma.Decimal(awardedPoints);
  const percentageDecimal = new Prisma.Decimal(percentage);

  const rewardReference = `TXN-TASK-RWD-${task.id.slice(-6)}-${student.sprStudentId || student.id.slice(-6)}`;
  const pointsReference = `PTS-TASK-${task.id.slice(-6)}-${student.sprStudentId || student.id.slice(-6)}`;

  // Execute in robust atomic transaction with 30s timeout
  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Fetch or create wallet
      let wallet = await tx.studentWallet.findUnique({ where: { studentId } });
      if (!wallet) {
        wallet = await tx.studentWallet.create({
          data: {
            studentId,
            balance: new Prisma.Decimal(0),
            totalEarnings: new Prisma.Decimal(0),
            totalTransferred: new Prisma.Decimal(0),
            totalReceived: new Prisma.Decimal(0),
            totalContributedToStore: new Prisma.Decimal(0),
          },
        });
      }

      // 2. Fetch existing StudentTaskRecord
      const existingRecord = await tx.studentTaskRecord.findUnique({
        where: {
          taskId_studentId: { taskId, studentId },
        },
      });

      const previousReward = existingRecord ? Number(existingRecord.awardedAmount) : 0;
      const deltaReward = Math.round((awardedReward - previousReward + Number.EPSILON) * 100) / 100;
      const deltaRewardDecimal = new Prisma.Decimal(deltaReward);

      // 3. Upsert StudentTaskRecord
      const updatedRecord = await tx.studentTaskRecord.upsert({
        where: {
          taskId_studentId: { taskId, studentId },
        },
        update: {
          status: 'APPROVED',
          approvedPercentage: percentageDecimal,
          awardedPoints: pointsDecimal,
          awardedAmount: rewardDecimal,
          approvedById: adminId,
          approvedAt: new Date(),
          adminRemarks: adminRemarks || undefined,
        },
        create: {
          taskId,
          studentId,
          status: 'APPROVED',
          approvedPercentage: percentageDecimal,
          awardedPoints: pointsDecimal,
          awardedAmount: rewardDecimal,
          approvedById: adminId,
          approvedAt: new Date(),
          adminRemarks: adminRemarks || undefined,
        },
      });

      // 4. Record Reward Ledger (idempotent / upsert)
      await tx.taskRewardLedger.upsert({
        where: { transactionReference: rewardReference },
        update: {
          amount: rewardDecimal,
          approvedById: adminId,
          approvedAt: new Date(),
        },
        create: {
          studentId,
          taskId,
          studentTaskId: updatedRecord.id,
          amount: rewardDecimal,
          transactionReference: rewardReference,
          approvedById: adminId,
          approvedAt: new Date(),
        },
      });

      // 5. Record Points Ledger (idempotent / upsert)
      await tx.taskPointsLedger.upsert({
        where: { reference: pointsReference },
        update: {
          points: pointsDecimal,
          approvedById: adminId,
          approvedAt: new Date(),
        },
        create: {
          studentId,
          taskId,
          studentTaskId: updatedRecord.id,
          points: pointsDecimal,
          reference: pointsReference,
          approvedById: adminId,
          approvedAt: new Date(),
        },
      });

      // 6. Credit wallet by delta amount (prevents double credit upon re-approval)
      let newBalance = Number(wallet.balance);
      if (deltaReward !== 0) {
        const updatedWallet = await tx.studentWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: deltaRewardDecimal },
            totalEarnings: { increment: deltaRewardDecimal },
          },
        });
        newBalance = Number(updatedWallet.balance);

        // Record wallet transaction
        const txnRef = `TXN-TASK-${task.taskId}-${student.sprStudentId || student.id.slice(-6)}-${Date.now()}`;
        await tx.walletTransaction.create({
          data: {
            reference: txnRef,
            studentId,
            type: 'EARNING',
            amount: deltaRewardDecimal,
            balanceBefore: wallet.balance,
            balanceAfter: updatedWallet.balance,
            description: `Earned ₹${awardedReward.toFixed(2)} from task "${task.title}" (${percentage}% approved)`,
            status: 'COMPLETED',
          },
        });
      }

      // Early closure when winner slots are filled (PART 17)
      if (task.closeWhenSlotsFilled && task.winnerSlots) {
        const approvedCount = await tx.studentTaskRecord.count({
          where: { taskId, status: 'APPROVED' },
        });
        if (approvedCount >= task.winnerSlots) {
          await tx.task.update({
            where: { id: taskId },
            data: { status: 'CLOSED' },
          });
        }
      }

      return {
        recordId: updatedRecord.id,
        percentage,
        awardedPoints,
        awardedReward,
        deltaReward,
        newBalance,
        taskTitle: task.title,
        studentName: student.fullName,
      };
    },
    {
      maxWait: 15000,
      timeout: 30000,
    }
  );

  // 7. Audit log after transaction commits
  logAuditAction({
    userId: adminId,
    userName: adminEmail,
    action: 'TASK_APPROVED',
    entity: 'StudentTaskRecord',
    entityId: result.recordId,
    newValue: {
      taskId,
      taskTitle: result.taskTitle,
      studentId,
      studentName: result.studentName,
      percentage: result.percentage,
      awardedPoints: result.awardedPoints,
      awardedReward: result.awardedReward,
      deltaReward: result.deltaReward,
      postExpiry: new Date() > task.endDate,
    },
    ipAddress,
    userAgent,
  }).catch(() => {});

  invalidateEngineCache();

  return {
    success: true,
    record: {
      id: result.recordId,
      status: 'APPROVED',
      awardedPoints: result.awardedPoints,
      awardedAmount: result.awardedReward,
    },
    ...result,
  };
}

/**
 * Admin: Reject a student's task report.
 */
export async function adminRejectTaskRecord(params: {
  taskId?: string;
  studentId?: string;
  studentTaskRecordId?: string;
  remarks?: string;
  adminRemarks?: string;
  adminId: string;
  adminEmail: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  let { taskId, studentId, remarks, adminRemarks, adminId, adminEmail, ipAddress, userAgent } = params;
  const finalRemarks = remarks || adminRemarks || 'Rejected by administrator';

  if (params.studentTaskRecordId && (!taskId || !studentId)) {
    const rec = await prisma.studentTaskRecord.findUnique({
      where: { id: params.studentTaskRecordId },
    });
    if (!rec) throw new Error('Student task record not found.');
    taskId = rec.taskId;
    studentId = rec.studentId;
  }

  if (!taskId || !studentId) {
    throw new Error('Both taskId and studentId (or valid studentTaskRecordId) are required.');
  }

  const record = await prisma.studentTaskRecord.upsert({
    where: { taskId_studentId: { taskId, studentId } },
    update: {
      status: 'REJECTED',
      adminRemarks: finalRemarks,
      approvedById: adminId,
      approvedAt: new Date(),
    },
    create: {
      taskId,
      studentId,
      status: 'REJECTED',
      adminRemarks: finalRemarks,
      approvedById: adminId,
      approvedAt: new Date(),
    },
  });

  logAuditAction({
    userId: adminId,
    userName: adminEmail,
    action: 'TASK_REJECTED',
    entity: 'StudentTaskRecord',
    entityId: record.id,
    newValue: { taskId, studentId, remarks: finalRemarks },
    ipAddress,
    userAgent,
  }).catch(() => {});

  invalidateEngineCache();

  return record;
}

/**
 * Admin: Remove a student record from a task.
 */
export async function adminRemoveStudentFromTask(params: {
  taskId: string;
  studentId: string;
  adminId: string;
  adminEmail: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const { taskId, studentId, adminId, adminEmail, ipAddress, userAgent } = params;

  await prisma.$transaction(async (tx) => {
    await tx.taskPointsLedger.deleteMany({ where: { taskId, studentId } });
    await tx.taskRewardLedger.deleteMany({ where: { taskId, studentId } });
    await tx.studentTaskRecord.deleteMany({ where: { taskId, studentId } });
    await tx.taskAssignment.deleteMany({ where: { taskId, studentId } });
  });

  logAuditAction({
    userId: adminId,
    userName: adminEmail,
    action: 'TASK_STUDENT_REMOVED',
    entity: 'StudentTaskRecord',
    newValue: { taskId, studentId },
    ipAddress,
    userAgent,
  }).catch(() => {});

  invalidateEngineCache();
  return { success: true };
}
