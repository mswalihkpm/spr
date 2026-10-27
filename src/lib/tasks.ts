import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { logAuditAction } from './audit';

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
  maxPoints: number;
  maxFund: number;
  startDate: string;
  endDate: string;
  targetAudience?: 'ALL' | 'SPECIFIC_CLASS' | 'SPECIFIC_STUDENTS';
  targetClassId?: string | null;
  assignedStudentIds?: string[];
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
      maxPoints: new Prisma.Decimal(params.maxPoints),
      maxFund: new Prisma.Decimal(params.maxFund),
      startDate: start,
      endDate: end,
      status: params.status || 'PUBLISHED',
      targetAudience: params.targetAudience || 'ALL',
      targetClassId: params.targetAudience === 'SPECIFIC_CLASS' ? params.targetClassId : null,
      createdById: params.createdById,
    },
  });

  // Assign specific students if provided
  if (params.targetAudience === 'SPECIFIC_STUDENTS' && params.assignedStudentIds && params.assignedStudentIds.length > 0) {
    await prisma.taskAssignment.createMany({
      data: params.assignedStudentIds.map((studentId) => ({
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
    include: {
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
      assignments: { select: { studentId: true } },
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

  // 1. Fetch eligible published tasks within valid date range
  const eligibleTasks = await prisma.task.findMany({
    where: {
      status: 'PUBLISHED',
      startDate: { lte: now },
      endDate: { gte: now },
      OR: [
        { targetAudience: 'ALL' },
        { targetAudience: 'SPECIFIC_CLASS', targetClassId: classId },
        { targetAudience: 'SPECIFIC_STUDENTS', assignments: { some: { studentId } } },
      ],
    },
    orderBy: { endDate: 'asc' },
  });

  // 2. Fetch student's existing task records
  const studentRecords = await prisma.studentTaskRecord.findMany({
    where: { studentId },
  });
  const recordByTaskId = new Map(studentRecords.map((r) => [r.taskId, r]));

  const availableTasks = eligibleTasks.map((t) => {
    const record = recordByTaskId.get(t.id);
    return {
      id: t.id,
      taskId: t.taskId,
      title: t.title,
      description: t.description,
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
    };
  });

  // 3. Fetch completed task history (includes expired tasks that were completed/approved)
  const historyRecords = await prisma.studentTaskRecord.findMany({
    where: {
      studentId,
      status: { in: ['APPROVED', 'COMPLETED', 'REJECTED'] },
    },
    include: {
      task: true,
    },
    orderBy: { updatedAt: 'desc' },
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

  // Exact calculations:
  // Awarded Points = Maximum Task Points * Approved Percentage / 100
  // Monetary Reward = Maximum Task Fund * Approved Percentage / 100
  const maxPointsNum = Number(task.maxPoints);
  const maxFundNum = Number(task.maxFund);

  const rawPoints = (maxPointsNum * percentage) / 100;
  const rawReward = (maxFundNum * percentage) / 100;

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

  return record;
}
