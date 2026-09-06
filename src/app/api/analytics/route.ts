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
      libraryRecords,
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
      prisma.libraryRecord.findMany(),
      prisma.academicClass.findMany({ where: { active: true }, orderBy: { numericGrade: 'asc' } }),
      prisma.school.findMany({ where: { active: true } }),
      prisma.category.findMany({ where: { active: true }, orderBy: { displayOrder: 'asc' } }),
    ]);

    const totalBooksRead = libraryRecords.reduce((acc, r) => acc + r.booksRead, 0);

    // Compute Overall Leaderboard for accurate averages and top students
    const leaderboard = await calculateAllLeaderboards();
    const overallAverageSPR =
      leaderboard.length > 0
        ? Number((leaderboard.reduce((acc, s) => acc + s.spr, 0) / leaderboard.length).toFixed(1))
        : 0;

    // Class performance comparison
    const classPerformance = await Promise.all(
      classes.map(async (cls) => {
        const classLeaderboard = await calculateAllLeaderboards({ classId: cls.id });
        const avg =
          classLeaderboard.length > 0
            ? Number((classLeaderboard.reduce((acc, s) => acc + s.spr, 0) / classLeaderboard.length).toFixed(1))
            : 0;
        return {
          id: cls.id,
          name: cls.name,
          numericGrade: cls.numericGrade,
          studentCount: classLeaderboard.length,
          averageSPR: avg,
        };
      })
    );

    // School performance comparison
    const schoolPerformance = await Promise.all(
      schools.map(async (sch) => {
        const schoolLeaderboard = await calculateAllLeaderboards({ schoolId: sch.id });
        const avg =
          schoolLeaderboard.length > 0
            ? Number((schoolLeaderboard.reduce((acc, s) => acc + s.spr, 0) / schoolLeaderboard.length).toFixed(1))
            : 0;
        const topStudent = schoolLeaderboard[0] ? schoolLeaderboard[0].name : 'N/A';
        return {
          id: sch.id,
          name: sch.name,
          code: sch.code,
          studentCount: schoolLeaderboard.length,
          averageSPR: avg,
          topStudent,
        };
      })
    );

    // Category performance averages
    const categoryPerformance = await Promise.all(
      categories.map(async (cat) => {
        const catLeaderboard = await calculateAllLeaderboards({ categoryId: cat.id });
        const avg =
          catLeaderboard.length > 0
            ? Number((catLeaderboard.reduce((acc, s) => acc + s.spr, 0) / catLeaderboard.length).toFixed(1))
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
      })
    );

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
