export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'VIEWER');
    if (errorResponse) return errorResponse;

    const [classes, categories, students] = await Promise.all([
      prisma.academicClass.findMany({
        where: { active: true },
        select: { id: true, name: true, numericGrade: true },
        orderBy: { numericGrade: 'asc' },
      }),
      prisma.category.findMany({
        where: { active: true },
        select: { id: true, name: true, code: true, icon: true, defaultWeight: true },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.student.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          fullName: true,
          studentId: true,
          sprStudentId: true,
          photoUrl: true,
          division: true,
          class: { select: { id: true, name: true, numericGrade: true } },
          school: { select: { id: true, name: true, code: true } },
          wallet: true,
          storeFund: true,
          earningLedgers: {
            select: {
              id: true,
              categoryId: true,
              sourceRecordId: true,
              sourceType: true,
              activityDate: true,
              eligiblePoints: true,
              categoryMultiplier: true,
              calculatedAmount: true,
              recognizedAmount: true,
              status: true,
              reference: true,
              metadata: true,
              createdAt: true,
              category: {
                select: { id: true, name: true, code: true, icon: true },
              },
            },
            orderBy: { activityDate: 'desc' },
          },
        },
      }),
    ]);

    // Compute institution-wide metrics
    let totalCashOffered = 0;
    let totalWalletBalance = 0;
    let totalCashToStore = 0;
    let totalAvailableStoreFund = 0;
    let totalStoreFundUsed = 0;
    let studentsWithEarnings = 0;

    const categoryTotalsMap = new Map<string, { code: string; name: string; amount: number; points: number }>();
    categories.forEach((c) => {
      categoryTotalsMap.set(c.id, { code: c.code, name: c.name, amount: 0, points: 0 });
    });

    const studentList = students.map((s) => {
      const offered = s.wallet ? Number(s.wallet.totalEarnings) : 0;
      const balance = s.wallet ? Number(s.wallet.balance) : 0;
      const toStore = s.wallet
        ? Number(s.wallet.totalContributedToStore)
        : s.storeFund
        ? Number(s.storeFund.totalContributed)
        : 0;
      const availStore = s.storeFund ? Number(s.storeFund.availableFund) : 0;
      const usedStore = s.storeFund ? Number(s.storeFund.totalUsed) : 0;

      totalCashOffered += offered;
      totalWalletBalance += balance;
      totalCashToStore += toStore;
      totalAvailableStoreFund += availStore;
      totalStoreFundUsed += usedStore;

      if (offered > 0) studentsWithEarnings++;

      // Student category-wise breakdown
      const studentCatMap = new Map<string, { categoryId: string; categoryCode: string; categoryName: string; amount: number; points: number }>();

      s.earningLedgers.forEach((l) => {
        const amt = Number(l.recognizedAmount) || 0;
        const pts = Number(l.eligiblePoints) || 0;
        const catId = l.categoryId;
        const catCode = l.category?.code || 'OTHER';
        const catName = l.category?.name || 'Other';

        if (!studentCatMap.has(catId)) {
          studentCatMap.set(catId, {
            categoryId: catId,
            categoryCode: catCode,
            categoryName: catName,
            amount: 0,
            points: 0,
          });
        }
        const sCat = studentCatMap.get(catId)!;
        sCat.amount = Number((sCat.amount + amt).toFixed(2));
        sCat.points = Number((sCat.points + pts).toFixed(2));

        // Accumulate institution category totals
        if (categoryTotalsMap.has(catId)) {
          const cTot = categoryTotalsMap.get(catId)!;
          cTot.amount = Number((cTot.amount + amt).toFixed(2));
          cTot.points = Number((cTot.points + pts).toFixed(2));
        }
      });

      return {
        id: s.id,
        fullName: s.fullName,
        studentId: s.studentId,
        sprStudentId: s.sprStudentId,
        photoUrl: s.photoUrl,
        division: s.division,
        classId: s.class?.id || null,
        className: s.class?.name || 'Unassigned',
        numericGrade: s.class?.numericGrade || 0,
        schoolName: s.school?.name || '',
        totalCashOffered: Number(offered.toFixed(2)),
        currentWalletBalance: Number(balance.toFixed(2)),
        cashToStore: Number(toStore.toFixed(2)),
        availableStoreFund: Number(availStore.toFixed(2)),
        storeFundUsed: Number(usedStore.toFixed(2)),
        categoryBreakdown: Array.from(studentCatMap.values()),
        recentLedgers: s.earningLedgers.slice(0, 10).map((l) => ({
          id: l.id,
          reference: l.reference,
          sourceType: l.sourceType,
          activityDate: l.activityDate.toISOString(),
          points: Number(l.eligiblePoints),
          multiplier: Number(l.categoryMultiplier),
          amount: Number(l.recognizedAmount),
          categoryName: l.category?.name || 'General',
          categoryCode: l.category?.code || '',
          metadata: l.metadata ? (() => { try { return JSON.parse(l.metadata); } catch { return null; } })() : null,
        })),
      };
    });

    // Default arrangement: student with more cash to less
    studentList.sort((a, b) => {
      if (b.totalCashOffered !== a.totalCashOffered) {
        return b.totalCashOffered - a.totalCashOffered;
      }
      return a.fullName.localeCompare(b.fullName);
    });

    // Compute class-wise aggregates
    const classFunds = classes.map((cls) => {
      const clsStudents = studentList.filter((s) => s.classId === cls.id);
      const clsOffered = clsStudents.reduce((acc, curr) => acc + curr.totalCashOffered, 0);
      const clsWallet = clsStudents.reduce((acc, curr) => acc + curr.currentWalletBalance, 0);
      const clsStore = clsStudents.reduce((acc, curr) => acc + curr.cashToStore, 0);
      const clsAvg = clsStudents.length > 0 ? clsOffered / clsStudents.length : 0;

      return {
        id: cls.id,
        name: cls.name,
        numericGrade: cls.numericGrade,
        studentCount: clsStudents.length,
        totalCashOffered: Number(clsOffered.toFixed(2)),
        totalWalletBalance: Number(clsWallet.toFixed(2)),
        totalCashToStore: Number(clsStore.toFixed(2)),
        averageCashOffered: Number(clsAvg.toFixed(2)),
      };
    });

    const payload = {
      kpi: {
        totalCashOffered: Number(totalCashOffered.toFixed(2)),
        totalWalletBalance: Number(totalWalletBalance.toFixed(2)),
        totalCashToStore: Number(totalCashToStore.toFixed(2)),
        totalAvailableStoreFund: Number(totalAvailableStoreFund.toFixed(2)),
        totalStoreFundUsed: Number(totalStoreFundUsed.toFixed(2)),
        totalStudents: students.length,
        studentsWithEarnings,
        averageCashPerStudent:
          studentsWithEarnings > 0
            ? Number((totalCashOffered / studentsWithEarnings).toFixed(2))
            : 0,
      },
      classFunds,
      categoryDistribution: Array.from(categoryTotalsMap.values()),
      classes,
      students: studentList,
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Fund analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch student fund analytics.' }, { status: 500 });
  }
}

