import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateStudentRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const { student, errorResponse } = await authenticateStudentRequest(req);
  if (errorResponse || !student) return errorResponse;

  const { code } = params;

  try {
    const body = await req.json();
    const { answers, progressPercentage } = body;

    const questionnaire = await prisma.questionnaire.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        questions: true,
      },
    });

    if (!questionnaire) {
      return NextResponse.json({ error: 'Questionnaire not found' }, { status: 404 });
    }

    const existingResponse = await prisma.questionnaireResponse.findUnique({
      where: {
        studentId_questionnaireId: {
          studentId: student.studentId,
          questionnaireId: questionnaire.id,
        },
      },
    });

    if (existingResponse?.status === 'LOCKED') {
      return NextResponse.json({ error: 'Questionnaire is locked' }, { status: 403 });
    }

    const computedProgress = Math.min(100, Math.max(0, Math.round(Number(progressPercentage) || 0)));
    const status = computedProgress >= 100 ? 'READY_FOR_REVIEW' : 'IN_PROGRESS';

    const saved = await prisma.questionnaireResponse.upsert({
      where: {
        studentId_questionnaireId: {
          studentId: student.studentId,
          questionnaireId: questionnaire.id,
        },
      },
      update: {
        answers: answers || {},
        progressPercent: computedProgress,
        status: existingResponse?.status === 'SUBMITTED' ? 'SUBMITTED' : status,
        lastSavedAt: new Date(),
      },
      create: {
        questionnaireId: questionnaire.id,
        studentId: student.studentId,
        answers: answers || {},
        progressPercent: computedProgress,
        status,
        lastSavedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      status: saved.status,
      progressPercentage: saved.progressPercent,
      lastSavedAt: saved.lastSavedAt,
    });
  } catch (err: any) {
    console.error('Error saving questionnaire response:', err);
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
  }
}
