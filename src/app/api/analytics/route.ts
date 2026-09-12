export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { calculateAllLeaderboards } from '@/lib/spr-engine';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'VIEWER');
    if (errorResponse) return errorResponse;

    const [
      totalStudents,
      activeCategories,
      totalPerformanceRecords,
      totalPrograms,
      totalCreativeWorks,
      totalLiteraryEntries,
      booksAggregate,
      classes,
      schools,
      categories,
    ] = await Promise.all([
      prisma.student.count({ where: { status: 'ACTIVE' } }),
      prisma.category.count({ where: { active: true } }),
      prisma.performanceRecord.count(),
      prisma.program.count(),
      prisma.creativeHubSubmission.count(),
      prisma.performanceRecord.count({ where: { category: { code: 'LITERARY' } } }),
      prisma.libraryRecord.aggregate({ _sum: { booksRead: true } }),
      prisma.academicClass.findMany({ where: { active: true }, orderBy: { numericGrade: 'asc' } }),
      prisma.school.findMany({ where: { active: true } }),
      prisma.category.findMany({ where: { active: true }, orderBy: { displayOrder: 'asc' } }),
    ]);

    const totalBooksRead = booksAggregate._sum.booksRead || 0;

    // Execute calculateAllLeaderboards ONLY ONCE for the entire institution
    const leaderboard = await calculateAllLeaderboards();
    const overallAverageSPR =
      leaderboard.length > 0
        ? Number((leaderboard.reduce((acc, s) => acc + s.spr, 0) / leaderboard.length).toFixed(1))
        : 0;

    // Class performance comparison (derived from single leaderboard calculation)
    const classPerformance = classes.map((cls) => {
      const classEntries = leaderboard.filter((s) => s.className === cls.name);
      const avg =
        classEntries.length > 0
          ? Number((classEntries.reduce((acc, s) => acc + s.spr, 0) / classEntries.length).toFixed(1))
          : 0;
      return {
        id: cls.id,
        name: cls.name,
        numericGrade: cls.numericGrade,
        studentCount: classEntries.length,
        averageSPR: avg,
      };
    });

    // School performance comparison (derived from single leaderboard calculation)
    const schoolPerformance = schools.map((sch) => {
      const schoolEntries = leaderboard.filter((s) => s.schoolName === sch.name);
      const avg =
        schoolEntries.length > 0
          ? Number((schoolEntries.reduce((acc, s) => acc + s.spr, 0) / schoolEntries.length).toFixed(1))
          : 0;
      const topStudent = schoolEntries[0] ? schoolEntries[0].name : 'N/A';
      return {
        id: sch.id,
        name: sch.name,
        code: sch.code,
        studentCount: schoolEntries.length,
        averageSPR: avg,
        topStudent,
      };
    });

    // Category performance averages (derived from single leaderboard calculation)
    const categoryPerformance = categories.map((cat) => {
      const catScores = leaderboard
        .map((s) => s.categoryPoints?.[cat.id] || 0)
        .filter((score) => score > 0);
      const avg =
        catScores.length > 0
          ? Number((catScores.reduce((acc, score) => acc + score, 0) / catScores.length).toFixed(1))
          : 0;
      return {
        id: cat.id,
        code: cat.code,
        name: cat.name,
        icon: cat.icon,
        defaultWeight: cat.defaultWeight,
        averagePercentage: avg,
        recordsCount: 0,
      };
    });

    // Recent audit activities
    const recentActivities = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        action: true,
        entity: true,
        userName: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      kpi: {
        totalStudents,
        overallAverageSPR,
        activeCategories,
        totalPerformanceRecords,
        totalPrograms,
        totalCreativeWorks,
        totalLiteraryEntries,
        totalBooksRead,
      },
      classPerformance,
      schoolPerformance,
      categoryPerformance,
      topStudents: leaderboard.slice(0, 5),
      recentActivities,
    });
  } catch (error: any) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics.' }, { status: 500 });
  }
}
