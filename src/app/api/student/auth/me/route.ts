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

    // Idempotently reconcile earnings and obtain wallet + store fund summaries
    const earningsData = await syncStudentEarnings(student.studentId);

    // Fetch recent transactions for this student
    const recentTransactions = await prisma.walletTransaction.findMany({
      where: { studentId: student.studentId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const formattedTransactions = recentTransactions.map((t) => ({
      id: t.id,
      reference: t.reference,
      type: t.type,
      amount: Number(t.amount),
      balanceBefore: Number(t.balanceBefore),
      balanceAfter: Number(t.balanceAfter),
      description: t.description,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    }));

    // Fetch enriched student profile, academic records, and lock status
    const studentRecord = await prisma.student.findUnique({
      where: { id: student.studentId },
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
      },
    });

    // Compile Itemized Score Ledger & Point Details
    const itemizedPointsLedger: any[] = [];

    // 1. Exam & Subject Performance Records
    if (studentRecord?.performanceRecords) {
      for (const rec of studentRecord.performanceRecords) {
        const isExam = Boolean(rec.examId || rec.subjectId);
        const pts = Number(rec.obtainedScore || 0);
        itemizedPointsLedger.push({
          id: rec.id,
          type: isExam ? 'EXAM' : 'PROGRAMME',
          date: rec.date ? new Date(rec.date).toISOString().slice(0, 10) : rec.createdAt.toISOString().slice(0, 10),
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
        const pts = att.points || Number(((pct * 0.2)).toFixed(2));
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
        itemizedPointsLedger.push({
          id: lib.id,
          type: 'LIBRARY',
          date: lib.createdAt.toISOString().slice(0, 10),
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
        itemizedPointsLedger.push({
          id: work.id,
          type: 'CREATIVE_HUB',
          date: work.date ? new Date(work.date).toISOString().slice(0, 10) : work.createdAt.toISOString().slice(0, 10),
          title: work.title || 'Creative Hub Contribution',
          categoryName: 'Creative Hub',
          categoryCode: 'CREATIVE_HUB',
          pointsEarned: pts,
          explanation: `Submitted creative work "${work.title}" (${work.publicationStatus || 'Published'})${work.publishedMediaName ? ` via ${work.publishedMediaName}` : ''} • Score: ${pts} pts`,
        });
      }
    }

    // Sort itemized ledger by date descending
    itemizedPointsLedger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate official SPR scoring & rankings
    let sprProfile = null;
    let rankInfo = { overallRank: 0, classRank: 0 };
    try {
      sprProfile = await calculateStudentSPR(student.studentId);
      const ranks = await calculateFastStudentRanks(
        student.studentId,
        studentRecord?.academicYearId || undefined,
        studentRecord?.classId || undefined
      );
      if (ranks) {
        rankInfo = {
          overallRank: ranks.overallRank,
          classRank: ranks.classRank,
        };
      }
    } catch (e) {
      console.error('Error calculating SPR for student me:', e);
    }

    // Fetch task summary
    const taskRecords = await prisma.studentTaskRecord.findMany({
      where: { studentId: student.studentId },
      include: {
        task: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // 5. Add approved tasks to itemizedPointsLedger
    if (taskRecords) {
      for (const t of taskRecords) {
        if (t.status === 'APPROVED' && (Number(t.awardedPoints) > 0 || Number(t.awardedAmount) > 0)) {
          itemizedPointsLedger.push({
            id: t.id,
            type: 'TASK',
            date: t.approvedAt ? new Date(t.approvedAt).toISOString().slice(0, 10) : t.createdAt.toISOString().slice(0, 10),
            title: `Task: ${t.task.title}`,
            categoryName: 'Tasks & Institutional Service',
            categoryCode: 'TASKS',
            pointsEarned: Number(t.awardedPoints) || 0,
            rewardAmount: Number(t.awardedAmount) || 0,
            explanation: `Approved task completion: awarded +${t.awardedPoints} SPR pts and ₹${t.awardedAmount} monetary reward`,
          });
        }
      }
      itemizedPointsLedger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    // Construct Annual Performance Progression Timeline (Jun 2025 to Mar 2026)
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

    const currentSprPct =
      (sprProfile as any)?.sprPercentage !== undefined
        ? Number((sprProfile as any).sprPercentage.toFixed(2))
        : sprProfile?.overallScore || 0;
    let runningPoints = 0;
    const performanceTimeline = academicMonths.map((m, mIdx) => {
      const monthRecords = itemizedPointsLedger.filter((rec) => {
        const d = new Date(rec.date);
        return d.getMonth() + 1 === m.index;
      });
      const monthPoints = monthRecords.reduce((s, r) => s + (Number(r.pointsEarned) || 0), 0);
      runningPoints += monthPoints;

      // Elapsed months up to current November
      let sprProgression: number | null = null;
      if (mIdx <= 5) {
        const factor = (mIdx + 1) / 6;
        sprProgression = Number(Math.max(0, Math.min(100, currentSprPct * factor)).toFixed(1));
        if (mIdx === 5) sprProgression = currentSprPct;
      }

      return {
        month: m.name,
        sprPercentage: sprProgression,
        cumulativePoints: Math.round(runningPoints),
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

    // Fetch questionnaire completion summary
    const questionnaireResponses = await prisma.questionnaireResponse.findMany({
      where: { studentId: student.studentId },
      select: { questionnaireId: true, status: true, progressPercent: true },
    });

    const totalQuestionnairesCount = await prisma.questionnaire.count();
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
          photoUrl: studentRecord?.photoUrl,
          className: studentRecord?.class?.name || student.className,
          academicYear: studentRecord?.academicYear?.name,
        },
        wallet: earningsData.wallet,
        categoryEarnings: earningsData.categoryEarnings,
        storeFund: earningsData.storeFund,
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
