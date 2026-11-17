import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateStudentRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { student, errorResponse } = await authenticateStudentRequest(req);
  if (errorResponse || !student) return errorResponse;

  try {
    const visibilitySetting = await prisma.systemSetting.findUnique({
      where: { key: 'QUESTIONNAIRES_STUDENT_VISIBILITY' },
    });
    const isHidden = visibilitySetting?.value === 'HIDDEN';

    const studentRecord = await prisma.student.findUnique({
      where: { id: student.studentId },
      select: { isProfileLocked: true },
    });

    if (isHidden) {
      return NextResponse.json({
        success: true,
        isHidden: true,
        message: 'Questionnaires are currently hidden by administration.',
        activities: [],
        isProfileLocked: studentRecord?.isProfileLocked ?? false,
      });
    }

    const questionnaires = await prisma.questionnaire.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        questions: {
          select: { id: true, isRequired: true },
        },
        responses: {
          where: { studentId: student.studentId },
        },
      },
    });

    const activities = questionnaires.map((q) => {
      const response = q.responses[0] || null;
      let status = response?.status || 'NOT_STARTED';
      let progress = response?.progressPercent || 0;

      // Personal & Family Questionnaire locking rule
      if (q.code === 'PERSONAL_FAMILY' && studentRecord?.isProfileLocked) {
        status = 'LOCKED';
      }

      return {
        id: q.id,
        code: q.code,
        title: q.title,
        description: q.description,
        category: q.category,
        displayOrder: q.displayOrder,
        totalQuestions: q.questions.length,
        requiredQuestions: q.questions.filter((x) => x.isRequired).length,
        status,
        progressPercentage: progress,
        lastSavedAt: response?.lastSavedAt || null,
        submittedAt: response?.submittedAt || null,
      };
    });

    return NextResponse.json({
      success: true,
      activities,
      isProfileLocked: studentRecord?.isProfileLocked ?? false,
    });
  } catch (err: any) {
    console.error('Error fetching student activities:', err);
    return NextResponse.json({ error: 'Failed to load activities' }, { status: 500 });
  }
}
