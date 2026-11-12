export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { invalidateEngineCache } from '@/lib/spr-engine';

const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah'
];

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse || !user) {
      return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const categoryCode = (searchParams.get('categoryCode') || 'ISLAMIC').toUpperCase();
    const calendarType = (searchParams.get('calendarType') || 'ENGLISH').toUpperCase();
    const classId = searchParams.get('classId');
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : 9;
    const year = searchParams.get('year')
      ? parseInt(searchParams.get('year')!, 10)
      : calendarType === 'HIJRI' ? 1448 : 2026;
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    // Validate category and calendar
    if (categoryCode !== 'ISLAMIC' && categoryCode !== 'SCHOOL') {
      return NextResponse.json({ error: 'Invalid study category. Must be ISLAMIC or SCHOOL.' }, { status: 400 });
    }
    if (calendarType !== 'ENGLISH' && calendarType !== 'HIJRI') {
      return NextResponse.json({ error: 'Invalid calendar type. Must be ENGLISH or HIJRI.' }, { status: 400 });
    }
    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid month. Must be between 1 and 12.' }, { status: 400 });
    }
    if (isNaN(year) || year < 1000 || year > 3000) {
      return NextResponse.json({ error: 'Invalid year.' }, { status: 400 });
    }

    // Fetch active classes
    const classes = await prisma.academicClass.findMany({
      where: { active: true },
      orderBy: { numericGrade: 'asc' },
    });

    // Build student query
    const studentWhere: any = {
      status: 'ACTIVE',
    };

    if (classId && classId !== 'ALL') {
      studentWhere.classId = classId;
    }

    if (search) {
      studentWhere.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { sprStudentId: { contains: search, mode: 'insensitive' } },
        { studentId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      select: {
        id: true,
        studentId: true,
        sprStudentId: true,
        fullName: true,
        division: true,
        photoUrl: true,
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        monthlyAttendances: {
          where: {
            categoryCode,
            calendarType,
            month,
            year,
          },
          select: {
            id: true,
            categoryCode: true,
            calendarType: true,
            month: true,
            monthName: true,
            year: true,
            percentage: true,
            points: true,
            updatedAt: true,
          },
        },
      },
      orderBy: [
        { class: { numericGrade: 'asc' } },
        { fullName: 'asc' },
      ],
    });

    const studentsWithAttendance = students.map((s) => {
      const att = s.monthlyAttendances?.[0] || null;
      return {
        id: s.id,
        studentId: s.studentId,
        sprStudentId: s.sprStudentId,
        fullName: s.fullName,
        division: s.division,
        photoUrl: s.photoUrl,
        class: s.class,
        attendance: att
          ? {
              id: att.id,
              percentage: att.percentage,
              points: att.points,
              month: att.month,
              monthName: att.monthName,
              year: att.year,
              calendarType: att.calendarType,
              categoryCode: att.categoryCode,
              updatedAt: att.updatedAt.toISOString(),
            }
          : null,
      };
    });

    // Compute basic summary stats
    const totalStudents = studentsWithAttendance.length;
    const recordedStudents = studentsWithAttendance.filter((s) => s.attendance !== null);
    const recordedCount = recordedStudents.length;
    const avgPercentage =
      recordedCount > 0
        ? Number(
            (
              recordedStudents.reduce((acc, curr) => acc + (curr.attendance?.percentage || 0), 0) /
              recordedCount
            ).toFixed(2)
          )
        : 0;
    const avgPoints =
      recordedCount > 0
        ? Number(
            (
              recordedStudents.reduce((acc, curr) => acc + (curr.attendance?.points || 0), 0) /
              recordedCount
            ).toFixed(2)
          )
        : 0;

    return NextResponse.json({
      categoryCode,
      calendarType,
      month,
      monthName: calendarType === 'HIJRI' ? HIJRI_MONTHS[month - 1] : ENGLISH_MONTHS[month - 1],
      year,
      classes,
      students: studentsWithAttendance,
      stats: {
        totalStudents,
        recordedCount,
        missingCount: totalStudents - recordedCount,
        avgPercentage,
        avgPoints,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/attendance:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance data.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse || !user) {
      return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      categoryCode: rawCategory,
      calendarType: rawCalendar,
      month: rawMonth,
      monthName: rawMonthName,
      year: rawYear,
      entries,
    } = body;

    const categoryCode = (rawCategory || '').toUpperCase();
    const calendarType = (rawCalendar || '').toUpperCase();
    const month = parseInt(rawMonth, 10);
    const year = parseInt(rawYear, 10);

    if (categoryCode !== 'ISLAMIC' && categoryCode !== 'SCHOOL') {
      return NextResponse.json({ error: 'Invalid category. Must be ISLAMIC or SCHOOL.' }, { status: 400 });
    }
    if (calendarType !== 'ENGLISH' && calendarType !== 'HIJRI') {
      return NextResponse.json({ error: 'Invalid calendar type. Must be ENGLISH or HIJRI.' }, { status: 400 });
    }
    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid month (1-12 required).' }, { status: 400 });
    }
    if (isNaN(year) || year < 1000 || year > 3000) {
      return NextResponse.json({ error: 'Invalid year.' }, { status: 400 });
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'At least one attendance entry is required.' }, { status: 400 });
    }

    const defaultMonthName = calendarType === 'HIJRI' ? HIJRI_MONTHS[month - 1] : ENGLISH_MONTHS[month - 1];
    const monthName = (rawMonthName || defaultMonthName).trim();

    // Validate all entries before database writes
    const validatedEntries: Array<{ studentId: string; percentage: number; points: number }> = [];
    for (const item of entries) {
      if (!item.studentId || typeof item.studentId !== 'string') {
        return NextResponse.json({ error: 'Invalid student ID in entry.' }, { status: 400 });
      }
      const rawPct = parseFloat(item.percentage);
      if (isNaN(rawPct) || rawPct < 0 || rawPct > 100) {
        return NextResponse.json(
          { error: `Attendance percentage must be between 0% and 100% for all students.` },
          { status: 400 }
        );
      }
      const percentage = Number(rawPct.toFixed(2));
      // Formula: Attendance Points = (Attendance Percentage / 100) * 20
      const points = Number(((percentage / 100) * 20).toFixed(2));
      validatedEntries.push({ studentId: item.studentId, percentage, points });
    }

    // Process all entries atomically or in batch upserts
    let upsertedCount = 0;
    for (const item of validatedEntries) {
      await prisma.monthlyAttendance.upsert({
        where: {
          studentId_categoryCode_calendarType_month_year: {
            studentId: item.studentId,
            categoryCode,
            calendarType,
            month,
            year,
          },
        },
        create: {
          studentId: item.studentId,
          categoryCode,
          calendarType,
          month,
          monthName,
          year,
          percentage: item.percentage,
          points: item.points,
          createdById: user.id,
        },
        update: {
          percentage: item.percentage,
          points: item.points,
          monthName,
          updatedAt: new Date(),
        },
      });
      upsertedCount++;
    }

    // Invalidate engine cache so overall scores, dossiers and leaderboards recalculate immediately
    invalidateEngineCache();

    // Audit log
    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: 'UPSERT_MONTHLY_ATTENDANCE',
      entity: 'MonthlyAttendance',
      newValue: {
        categoryCode,
        calendarType,
        month,
        monthName,
        year,
        count: upsertedCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${upsertedCount} attendance record(s).`,
      count: upsertedCount,
    });
  } catch (error: any) {
    console.error('Error in POST /api/attendance:', error);
    return NextResponse.json({ error: 'Failed to save attendance entries.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse || !user) {
      return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Attendance record ID required.' }, { status: 400 });
    }

    const existing = await prisma.monthlyAttendance.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
    }

    await prisma.monthlyAttendance.delete({
      where: { id },
    });

    invalidateEngineCache();

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: 'DELETE_MONTHLY_ATTENDANCE',
      entity: 'MonthlyAttendance',
      entityId: id,
      newValue: {
        categoryCode: existing.categoryCode,
        calendarType: existing.calendarType,
        month: existing.month,
        year: existing.year,
        studentId: existing.studentId,
      },
    });

    return NextResponse.json({ success: true, message: 'Attendance record removed.' });
  } catch (error: any) {
    console.error('Error in DELETE /api/attendance:', error);
    return NextResponse.json({ error: 'Failed to delete attendance record.' }, { status: 500 });
  }
}
