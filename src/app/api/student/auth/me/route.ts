export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateStudentRequest } from '@/lib/auth';
import { syncStudentEarnings } from '@/lib/student-earnings';
import { calculateStudentSPR, calculateFastStudentRanks } from '@/lib/spr-engine';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { student, errorResponse } = await authenticateStudentRequest(req);
    if (errorResponse) return errorResponse;
    if (!student) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = student.studentId;

    // Parallelize all independent database lookups and calculations for maximum speed
    const [
      earningsData,
      recentTransactions,
      studentRecord,
      taskRecords,
      questionnaireResponses,
      totalQuestionnairesCount,
      sprProfile,
    ] = await Promise.all([
      syncStudentEarnings(studentId),
      prisma.walletTransaction.findMany({
        where: { studentId },
        include: {
          senderStudent: { select: { fullName: true, sprStudentId: true } },
          recipientStudent: { select: { fullName: true, sprStudentId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.student.findUnique({
        where: { id: studentId },
        include: {
          class: true,
          academicYear: true,
          performanceRecords: {
            include: {
              category: { select: { id: true, name: true, code: true } },
              subcategory: { select: { id: true, name: true, code: true, weight: true } },
              exam: { select: { id: true, name: true } },
              subject: { select: { id: true, name: true, code: true, maxScore: true } },
              level: { select: { id: true, name: true, code: true, weightMultiplier: true } },
            },
            orderBy: { date: 'desc' },
          },
          monthlyAttendances: {
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
          },
          libraryRecords: {
            orderBy: { createdAt: 'desc' },
          },
          creativeWorks: {
            orderBy: { createdAt: 'desc' },
          },
          pointAdjustments: {
            include: { reason: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.studentTaskRecord.findMany({
        where: { studentId },
        include: {
          task: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.questionnaireResponse.findMany({
        where: { studentId },
        select: { questionnaireId: true, status: true, progressPercent: true },
      }),
      prisma.questionnaire.count(),
      calculateStudentSPR(studentId),
    ]);

    const formattedTransactions = recentTransactions.map((t) => ({
      id: t.id,
      reference: t.reference,
      type: t.type,
      amount: Number(t.amount),
      balanceBefore: Number(t.balanceBefore),
      balanceAfter: Number(t.balanceAfter),
      description: t.description,
      status: t.status,
      senderName: t.senderStudent?.fullName,
      recipientName: t.recipientStudent?.fullName,
      createdAt: t.createdAt.toISOString(),
    }));

    // Calculate student ranks using in-memory cached leaderboard
    let rankInfo = { overallRank: 0, classRank: 0, schoolRank: 0 };
    try {
      const ranks = await calculateFastStudentRanks(
        studentId,
        studentRecord?.academicYearId || undefined,
        studentRecord?.classId || undefined
      );
      if (ranks) {
        rankInfo = {
          overallRank: ranks.overallRank,
          classRank: ranks.classRank,
          schoolRank: ranks.schoolRank,
        };
      }
    } catch (e) {
      console.error('Error calculating student ranks:', e);
    }

    // Compile Itemized Score Ledger & Point Details
    const itemizedPointsLedger: any[] = [];
    const allDatedItems: Array<{ date: Date; points: number }> = [];

    // 1. Exam & Subject Performance Records
    if (studentRecord?.performanceRecords) {
      for (const rec of studentRecord.performanceRecords) {
        const isExam = Boolean(rec.examId || rec.subjectId);
        const pts = Number(rec.obtainedScore || 0);
        const itemDate = rec.date ? new Date(rec.date) : new Date(rec.createdAt);
        allDatedItems.push({ date: itemDate, points: pts });

        itemizedPointsLedger.push({
          id: rec.id,
          type: isExam ? 'EXAM' : 'PROGRAMME',
          date: itemDate.toISOString().slice(0, 10),
          title: isExam
            ? `${rec.exam?.name || 'Academic Exam'} • ${rec.subject?.name || 'General Subject'}`
            : rec.subcategory?.name || 'Competition Programme',
          categoryName: rec.category?.name || 'Academics',
          categoryCode: rec.category?.code || 'ACADEMIC',
          obtainedScore: rec.obtainedScore,
          maxScore: rec.maxScore || rec.subject?.maxScore || 100,
          percentage: rec.percentage,
          position: rec.position,
          grade: rec.grade,
          levelName: rec.level?.name,
          pointsEarned: pts,
          explanation: isExam
            ? `Scored ${rec.obtainedScore}/${rec.maxScore || 100} (${rec.percentage || 0}%) in ${rec.subject?.name || 'Exam Subject'}`
            : `${rec.position || 'Participation'} in ${rec.subcategory?.name || 'Activity'}${rec.level?.name ? ` at ${rec.level.name} level` : ''}`,
        });
      }
    }

    // 2. Attendance Records
    if (studentRecord?.monthlyAttendances) {
      for (const att of studentRecord.monthlyAttendances) {
        const pct = att.percentage || 0;
        const pts = att.points || Number((pct * 0.2).toFixed(2));
        const itemDate = new Date(att.year, att.month - 1, 1);
        allDatedItems.push({ date: itemDate, points: pts });

        itemizedPointsLedger.push({
          id: att.id,
          type: 'ATTENDANCE',
          date: `${att.year}-${String(att.month).padStart(2, '0')}-01`,
          title: `${att.categoryCode === 'ISLAMIC' ? 'Islamic' : 'School'} Attendance (${att.monthName || att.month} ${att.year})`,
          categoryName: att.categoryCode === 'ISLAMIC' ? 'Islamic Studies' : 'School Education',
          categoryCode: att.categoryCode,
          obtainedScore: pct,
          maxScore: 100,
          percentage: pct,
          pointsEarned: pts,
          explanation: `Monthly attendance recorded at ${pct}% • Contributed ${pts} attendance points`,
        });
      }
    }

    // 3. Library & Reading Records
    if (studentRecord?.libraryRecords) {
      for (const lib of studentRecord.libraryRecords) {
        const pts = lib.readingScore || (lib.booksRead || 0) * 20;
        const itemDate = new Date(lib.createdAt);
        allDatedItems.push({ date: itemDate, points: pts });

        itemizedPointsLedger.push({
          id: lib.id,
          type: 'LIBRARY',
          date: itemDate.toISOString().slice(0, 10),
          title: lib.readingPeriod ? `Library Reading (${lib.readingPeriod})` : 'Library Book Reading Session',
          categoryName: 'Library & Reading',
          categoryCode: 'LIBRARY',
          pointsEarned: pts,
          explanation: `Evaluated ${lib.booksRead || 0} books read • Reading assessment points: ${pts} pts`,
        });
      }
    }

    // 4. Creative Works
    if (studentRecord?.creativeWorks) {
      for (const work of studentRecord.creativeWorks) {
        const pts = work.score || 20;
        const itemDate = work.date ? new Date(work.date) : new Date(work.createdAt);
        allDatedItems.push({ date: itemDate, points: pts });

        itemizedPointsLedger.push({
          id: work.id,
          type: 'CREATIVE_HUB',
          date: itemDate.toISOString().slice(0, 10),
          title: work.title || 'Creative Hub Contribution',
          categoryName: 'Creative Hub',
          categoryCode: 'CREATIVE_HUB',
          pointsEarned: pts,
          explanation: `Submitted creative work "${work.title}" (${work.publicationStatus || 'Published'})${work.publishedMediaName ? ` via ${work.publishedMediaName}` : ''} • Score: ${pts} pts`,
        });
      }
    }

    // 5. Approved Tasks
    if (taskRecords) {
      for (const t of taskRecords) {
        if (t.status === 'APPROVED' && (Number(t.awardedPoints) > 0 || Number(t.awardedAmount) > 0)) {
          const pts = Number(t.awardedPoints) || 0;
          const itemDate = t.approvedAt ? new Date(t.approvedAt) : new Date(t.createdAt);
          allDatedItems.push({ date: itemDate, points: pts });

          itemizedPointsLedger.push({
            id: t.id,
            type: 'TASK',
            date: itemDate.toISOString().slice(0, 10),
            title: `Task: ${t.task.title}`,
            categoryName: 'Tasks & Institutional Service',
            categoryCode: 'TASKS',
            pointsEarned: pts,
            rewardAmount: Number(t.awardedAmount) || 0,
            explanation: `Approved task completion: awarded +${t.awardedPoints} SPR pts and ₹${t.awardedAmount} monetary reward`,
          });
        }
      }
    }

    // 6. Point Adjustments (Admin Corrections)
    if (studentRecord?.pointAdjustments) {
      for (const adj of studentRecord.pointAdjustments) {
        const pts = Number(adj.points || 0);
        const itemDate = new Date(adj.createdAt);
        allDatedItems.push({ date: itemDate, points: pts });

        itemizedPointsLedger.push({
          id: adj.id,
          type: 'POINT_ADJUSTMENT',
          date: itemDate.toISOString().slice(0, 10),
          title: adj.reason?.title || (adj.reason as any)?.name || 'Administrative Point Correction',
          categoryName: 'Administrative Corrections',
          categoryCode: 'ADMIN_CORRECTION',
          pointsEarned: pts,
          explanation: pts >= 0 ? `Admin correction: +${pts} SPR points` : `Admin correction: ${pts} SPR points`,
          notes: adj.notes || undefined,
        });
      }
    }

    // Sort itemized ledger by date descending
    itemizedPointsLedger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const currentSprPct =
      (sprProfile as any)?.sprPercentage !== undefined
        ? Number((sprProfile as any).sprPercentage.toFixed(2))
        : sprProfile?.overallScore || 0;

    // Construct Weekly Performance Timeline (starts July 1, 2026, advances weekly up to present)
    const academicStart = new Date('2026-07-01T00:00:00Z');
    const now = new Date();
    const weeklyPerformanceTimeline: any[] = [];
    let wCursor = new Date(academicStart);
    let wIndex = 1;
    let runningWeeklyPoints = 0;

    while (wCursor <= now) {
      const wStart = new Date(wCursor);
      const wEnd = new Date(wCursor.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

      const weekRecords = allDatedItems.filter((it) => it.date >= wStart && it.date <= wEnd);
      const weekPoints = weekRecords.reduce((sum, it) => sum + it.points, 0);
      runningWeeklyPoints += weekPoints;

      weeklyPerformanceTimeline.push({
        week: `W${wIndex}`,
        weekName: `Week ${wIndex}`,
        dateRange: `${wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${wEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        weeklyPoints: Number(weekPoints.toFixed(1)),
        cumulativePoints: Number(runningWeeklyPoints.toFixed(1)),
        activityCount: weekRecords.length,
        sprPercentage: 0,
      });

      wCursor = new Date(wCursor.getTime() + 7 * 24 * 60 * 60 * 1000);
      wIndex++;
    }

    const totalRecordedPoints = Math.max(1, runningWeeklyPoints);
    weeklyPerformanceTimeline.forEach((w, idx) => {
      if (idx === weeklyPerformanceTimeline.length - 1) {
        w.sprPercentage = currentSprPct;
      } else {
        const ratio = totalRecordedPoints > 0 ? w.cumulativePoints / totalRecordedPoints : (idx + 1) / weeklyPerformanceTimeline.length;
        w.sprPercentage = Number((currentSprPct * ratio).toFixed(2));
      }
    });

    // Backwards-compatible monthly timeline (Jun 2025 to Mar 2026)
    const academicMonths = [
      { name: 'Jun', index: 6 },
      { name: 'Jul', index: 7 },
      { name: 'Aug', index: 8 },
      { name: 'Sep', index: 9 },
      { name: 'Oct', index: 10 },
      { name: 'Nov', index: 11 },
      { name: 'Dec', index: 12 },
      { name: 'Jan', index: 1 },
      { name: 'Feb', index: 2 },
      { name: 'Mar', index: 3 },
    ];

    let runningMonthlyPoints = 0;
    const performanceTimeline = academicMonths.map((m, mIdx) => {
      const monthRecords = itemizedPointsLedger.filter((rec) => {
        const d = new Date(rec.date);
        return d.getMonth() + 1 === m.index;
      });
      const monthPoints = monthRecords.reduce((s, r) => s + (Number(r.pointsEarned) || 0), 0);
      runningMonthlyPoints += monthPoints;

      let sprProgression: number | null = null;
      if (mIdx <= 5) {
        const factor = (mIdx + 1) / 6;
        sprProgression = Number(Math.max(0, currentSprPct * factor).toFixed(2));
        if (mIdx === 5) sprProgression = currentSprPct;
      }

      return {
        month: m.name,
        sprPercentage: sprProgression,
        cumulativePoints: Math.round(runningMonthlyPoints),
        activityCount: monthRecords.length,
      };
    });

    const taskSummary = {
      assignedCount: taskRecords.length,
      pendingCount: taskRecords.filter((t) => t.status === 'PENDING' || t.status === 'UNDER_REVIEW').length,
      completedCount: taskRecords.filter((t) => t.status === 'APPROVED' || t.status === 'COMPLETED').length,
      recent: taskRecords.map((t) => ({
        id: t.id,
        taskId: t.taskId,
        taskTitle: t.task.title,
        deadline: t.task.endDate,
        status: t.status,
        awardedPoints: Number(t.awardedPoints) || 0,
        awardedAmount: Number(t.awardedAmount) || 0,
      })),
    };

    const completedQuestionnairesCount = questionnaireResponses.filter((q) => q.status === 'SUBMITTED').length;

    return NextResponse.json(
      {
        student: {
          ...student,
          fullName: studentRecord?.fullName || (student as any).name || (student as any).fullName || '',
          fatherName: studentRecord?.fatherName,
          motherName: studentRecord?.motherName,
          houseName: studentRecord?.houseName,
          guardianPhone: studentRecord?.guardianPhone,
          studentPhone: studentRecord?.studentPhone,
          studentEmail: studentRecord?.studentEmail,
          place: studentRecord?.place,
          district: studentRecord?.district,
          residentialStatus: studentRecord?.residentialStatus,
          preferredContact: studentRecord?.preferredContact,
          isProfileLocked: studentRecord?.isProfileLocked ?? false,
          photoUrl: studentRecord?.photoUrl || (student as any)?.photoUrl || null,
          className: studentRecord?.class?.name || student.className,
          academicYear: studentRecord?.academicYear?.name,
        },
        wallet: earningsData.wallet,
        categoryEarnings: earningsData.categoryEarnings,
        storeFund: earningsData.storeFund,
        transactions: formattedTransactions,
        recentTransactions: formattedTransactions,
        sprProfile,
        rankInfo,
        taskSummary,
        questionnairesSummary: {
          total: totalQuestionnairesCount || 12,
          completed: completedQuestionnairesCount,
          isProfileLocked: studentRecord?.isProfileLocked ?? false,
        },
        itemizedPointsLedger,
        weeklyPerformanceTimeline,
        performanceTimeline,
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Student me error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load student dashboard data.' },
      { status: 500 }
    );
  }
}
