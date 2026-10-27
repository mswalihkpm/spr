import { prisma } from '../src/lib/prisma';
import {
  createTask,
  getAdminTasks,
  getAdminTaskDetail,
  getStudentTasks,
  submitStudentTaskCompletion,
  adminAddStudentToTask,
  adminApproveTaskCompletion,
} from '../src/lib/tasks';

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 SPR TASK MANAGEMENT MODULE — COMPREHENSIVE TEST SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
      failedTests++;
    }
  }

  // Find an admin user and a test student
  const admin = await prisma.user.findFirst({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
  });
  if (!admin) throw new Error('No admin user found for tests.');

  const student = await prisma.student.findFirst({
    where: { status: 'ACTIVE' },
    include: { class: true },
  });
  if (!student) throw new Error('No active student found for tests.');

  const secondStudent = await prisma.student.findFirst({
    where: { status: 'ACTIVE', id: { not: student.id } },
    include: { class: true },
  });

  console.log(`Using Admin: ${admin.name} (${admin.email})`);
  console.log(`Using Student 1: ${student.fullName} (${student.sprStudentId})`);
  if (secondStudent) {
    console.log(`Using Student 2: ${secondStudent.fullName} (${secondStudent.sprStudentId})\n`);
  }

  // -------------------------------------------------------------
  // TEST A: Task Creation & Validation
  // -------------------------------------------------------------
  console.log('--- PHASE A: TASK CREATION & VALIDATION ---');

  // Test A1: Reject missing title
  try {
    await createTask({
      title: '',
      description: 'Test description',
      maxPoints: 20,
      maxFund: 10,
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      createdById: admin.id,
      createdByEmail: admin.email,
    });
    assert(false, 'Reject missing title');
  } catch (err: any) {
    assert(err.message.toLowerCase().includes('title is required'), 'Reject missing title');
  }

  // Test A2: Reject missing start date
  try {
    await createTask({
      title: 'Missing Start Date',
      description: 'Test',
      maxPoints: 20,
      maxFund: 10,
      startDate: '',
      endDate: '2026-11-05',
      createdById: admin.id,
      createdByEmail: admin.email,
    });
    assert(false, 'Reject missing start date');
  } catch (err: any) {
    assert(err.message.toLowerCase().includes('start date is mandatory'), 'Reject missing start date');
  }

  // Test A3: Reject missing end date
  try {
    await createTask({
      title: 'Missing End Date',
      description: 'Test',
      maxPoints: 20,
      maxFund: 10,
      startDate: '2026-11-01',
      endDate: '',
      createdById: admin.id,
      createdByEmail: admin.email,
    });
    assert(false, 'Reject missing end date');
  } catch (err: any) {
    assert(err.message.toLowerCase().includes('end date is mandatory'), 'Reject missing end date');
  }

  // Test A4: Reject end date earlier than start date
  try {
    await createTask({
      title: 'Inverted Dates',
      description: 'Test',
      maxPoints: 20,
      maxFund: 10,
      startDate: '2026-11-05',
      endDate: '2026-11-01',
      createdById: admin.id,
      createdByEmail: admin.email,
    });
    assert(false, 'Reject end date earlier than start date');
  } catch (err: any) {
    assert(err.message.toLowerCase().includes('cannot be earlier than start date'), 'Reject end date earlier than start date');
  }

  // Test A5: Reject negative points or fund
  try {
    await createTask({
      title: 'Negative Points',
      description: 'Test',
      maxPoints: -10,
      maxFund: 10,
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      createdById: admin.id,
      createdByEmail: admin.email,
    });
    assert(false, 'Reject negative points');
  } catch (err: any) {
    assert(err.message.includes('non-negative'), 'Reject negative points');
  }

  // Test A6: Create Valid Scheduled Task (Future)
  const scheduledTask = await createTask({
    title: 'TEST_SCHEDULED_TASK Future Science Project',
    description: 'This is a scheduled task that begins next month.',
    maxPoints: 20,
    maxFund: 10,
    startDate: '2026-11-20',
    endDate: '2026-11-25',
    targetAudience: 'ALL',
    status: 'PUBLISHED',
    createdById: admin.id,
    createdByEmail: admin.email,
  });
  assert(
    !!scheduledTask && scheduledTask.taskId.startsWith('TSK-'),
    'Create valid scheduled task with TSK- ID code'
  );

  // Test A7: Create Valid Active Task (Covers today)
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeTask = await createTask({
    title: 'TEST_ACTIVE_TASK Current Coding Challenge',
    description: 'Active task for today to earn points.',
    maxPoints: 20,
    maxFund: 10,
    startDate: todayStr,
    endDate: todayStr,
    targetAudience: 'ALL',
    status: 'PUBLISHED',
    createdById: admin.id,
    createdByEmail: admin.email,
  });
  assert(!!activeTask, 'Create valid active task for current date');

  // Test A8: Create Valid Expired Task (Past dates)
  const expiredTask = await createTask({
    title: 'TEST_EXPIRED_TASK Past Essay Submission',
    description: 'Task whose end date was yesterday.',
    maxPoints: 20,
    maxFund: 10,
    startDate: '2026-10-01',
    endDate: '2026-10-15',
    targetAudience: 'ALL',
    status: 'PUBLISHED',
    createdById: admin.id,
    createdByEmail: admin.email,
  });
  assert(!!expiredTask, 'Create valid expired task');

  // -------------------------------------------------------------
  // TEST B & C: Student Date Bounds & Expiry Enforcement
  // -------------------------------------------------------------
  console.log('\n--- PHASE B & C: STUDENT ACCESS & EXPIRY BOUNDS ---');

  const studentTasksData = await getStudentTasks(student.id, student.classId);
  const studentAvailableIds = studentTasksData.availableTasks.map((t) => t.id);

  // Scheduled task must NOT appear in student's available list
  assert(!studentAvailableIds.includes(scheduledTask.id), 'Future scheduled task is hidden from Student Available list');

  // Active task MUST appear in student's available list
  assert(studentAvailableIds.includes(activeTask.id), 'Current active task is visible in Student Available list');

  // Expired task must NOT appear in student's available list
  assert(!studentAvailableIds.includes(expiredTask.id), 'Expired task is hidden from Student Available list');

  // Student reporting completion on ACTIVE task must succeed
  const submitResult = await submitStudentTaskCompletion({
    taskId: activeTask.id,
    studentId: student.id,
    notes: 'Completed all challenge requirements successfully.',
  });
  assert(submitResult.status === 'UNDER_REVIEW', 'Student can report completion on active task');

  // Student reporting completion on EXPIRED task MUST BE REJECTED
  try {
    await submitStudentTaskCompletion({
      taskId: expiredTask.id,
      studentId: student.id,
      notes: 'Trying to submit after deadline.',
    });
    assert(false, 'Student submission on expired task rejected');
  } catch (err: any) {
    assert(err.message.includes('expired'), 'Student submission on expired task rejected by backend');
  }

  // -------------------------------------------------------------
  // TEST D: POST-EXPIRY ADMIN MANAGEMENT (CRITICAL RULE!)
  // -------------------------------------------------------------
  console.log('\n--- PHASE D: POST-EXPIRY ADMIN MANAGEMENT (NON-NEGOTIABLE RULE) ---');

  // Admin opens expired task detail
  const expiredDetail = await getAdminTaskDetail(expiredTask.id);
  assert(expiredDetail.id === expiredTask.id, 'Admin can open expired task detail');
  assert(expiredDetail.dateStatus === 'EXPIRED', 'Date status is correctly identified as EXPIRED');

  // Admin manually adds student to expired task
  const addStudentResult = await adminAddStudentToTask({
    taskId: expiredTask.id,
    studentId: student.id,
    adminId: admin.id,
    adminEmail: admin.email,
  });
  assert(!!addStudentResult && addStudentResult.studentId === student.id, 'Admin can manually add student to expired task');

  // Admin records completion and approves 100% reward on EXPIRED task
  const expiredApproval = await adminApproveTaskCompletion({
    studentTaskRecordId: addStudentResult.id,
    approvedPercentage: 100,
    adminId: admin.id,
    adminEmail: admin.email,
    adminRemarks: 'Verified offline work submitted before deadline.',
  });

  assert(expiredApproval.record.status === 'APPROVED', 'Admin can approve completed record on expired task');
  assert(expiredApproval.record.awardedPoints === 20, 'Expired task awarded full 20 points');
  assert(expiredApproval.deltaReward === 10, 'Student wallet received full ₹10 delta reward');

  // -------------------------------------------------------------
  // TEST E: REWARD CALCULATION FORMULAS
  // -------------------------------------------------------------
  console.log('\n--- PHASE E: REWARD CALCULATION FORMULAS (75%, 50%, 25%) ---');

  // Create a dedicated task for percentage testing: Max Points = 20, Max Fund = 10
  const pctTask = await createTask({
    title: 'TEST_PERCENTAGE_MATH Math Calculation Test',
    description: 'Testing percentage formulas.',
    maxPoints: 20,
    maxFund: 10,
    startDate: '2026-10-01',
    endDate: '2026-10-20',
    targetAudience: 'ALL',
    status: 'PUBLISHED',
    createdById: admin.id,
    createdByEmail: admin.email,
  });

  if (secondStudent) {
    const s2Record = await adminAddStudentToTask({
      taskId: pctTask.id,
      studentId: secondStudent.id,
      adminId: admin.id,
      adminEmail: admin.email,
    });

    // Test 75% approval
    const approval75 = await adminApproveTaskCompletion({
      studentTaskRecordId: s2Record.id,
      approvedPercentage: 75,
      adminId: admin.id,
      adminEmail: admin.email,
      adminRemarks: '75% completion test',
    });
    assert(approval75.record.awardedPoints === 15, '75% points: 20 * 0.75 = 15 pts');
    assert(approval75.record.awardedAmount === 7.5, '75% reward: 10 * 0.75 = ₹7.50');

    // -------------------------------------------------------------
    // TEST F: DUPLICATE PROTECTION & RE-APPROVAL ADJUSTMENTS
    // -------------------------------------------------------------
    console.log('\n--- PHASE F: DUPLICATE PROTECTION & IDEMPOTENCY ---');

    // Attempting same 75% approval again
    const reApprovalSame = await adminApproveTaskCompletion({
      studentTaskRecordId: s2Record.id,
      approvedPercentage: 75,
      adminId: admin.id,
      adminEmail: admin.email,
    });
    assert(
      reApprovalSame.deltaReward === 0,
      'Duplicate approval at same percentage produces zero new wallet credits (deltaReward: 0)'
    );

    // Adjusting percentage upwards from 75% to 100%:
    // delta = +5 points, +₹2.50
    const walletBeforeAdjustment = await prisma.studentWallet.findUnique({
      where: { studentId: secondStudent.id },
    });
    const balanceBefore = Number(walletBeforeAdjustment?.balance || 0);

    const adjustmentApproval = await adminApproveTaskCompletion({
      studentTaskRecordId: s2Record.id,
      approvedPercentage: 100,
      adminId: admin.id,
      adminEmail: admin.email,
      adminRemarks: 'Adjusted to 100%',
    });

    const walletAfterAdjustment = await prisma.studentWallet.findUnique({
      where: { studentId: secondStudent.id },
    });
    const balanceAfter = Number(walletAfterAdjustment?.balance || 0);
    const expectedDiff = 2.5; // (₹10.00 - ₹7.50)

    assert(
      Math.abs(balanceAfter - balanceBefore - expectedDiff) < 0.01,
      `Percentage adjustment accurately credited only delta ₹${expectedDiff}`
    );
  }

  // -------------------------------------------------------------
  // TEST G: KUTHBKHANA & SPR SYSTEM INTEGRITY
  // -------------------------------------------------------------
  console.log('\n--- PHASE G: KUTHBKHANA WEIGHT & SPR INTEGRITY ---');
  const kuthbkhanaCategory = await prisma.category.findFirst({
    where: { name: 'Kuthbkhana' },
    include: { categoryWeights: true },
  });
  assert(!!kuthbkhanaCategory, 'Kuthbkhana category exists in database');
  assert(Number(kuthbkhanaCategory?.defaultWeight) === 1.5, 'Kuthbkhana default weight is 1.5');
  const allWeightsAre1Point5 = kuthbkhanaCategory?.categoryWeights.every((w) => Number(w.weight) === 1.5);
  assert(allWeightsAre1Point5 === true, 'All academic year weights for Kuthbkhana are 1.5');

  // -------------------------------------------------------------
  // CLEANUP TEST TASKS
  // -------------------------------------------------------------
  console.log('\n--- CLEANING UP TEST ARTIFACTS ---');
  const testTasks = await prisma.task.findMany({
    where: { title: { startsWith: 'TEST_' } },
    select: { id: true },
  });
  for (const t of testTasks) {
    await prisma.taskRewardLedger.deleteMany({ where: { taskId: t.id } });
    await prisma.taskPointsLedger.deleteMany({ where: { taskId: t.id } });
    await prisma.studentTaskRecord.deleteMany({ where: { taskId: t.id } });
    await prisma.taskAssignment.deleteMany({ where: { taskId: t.id } });
    await prisma.task.delete({ where: { id: t.id } });
  }
  console.log(`Cleaned up ${testTasks.length} test tasks.`);

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passedTests + failedTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .catch((e) => {
    console.error('Test suite error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
