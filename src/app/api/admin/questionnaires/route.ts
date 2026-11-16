export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'TEACHER');
    if (errorResponse) return errorResponse;

    const questionnaires = await prisma.questionnaire.findMany({
      include: {
        questions: {
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: { responses: true },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({ questionnaires });
  } catch (error: any) {
    console.error('Admin questionnaires GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch questionnaires' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { action, questionnaireId, questionData, questionnaireData } = body;

    // Action 1: Add new question to questionnaire
    if (action === 'ADD_QUESTION') {
      const {
        title,
        description,
        questionType,
        isRequired = true,
        options = [],
        conditionalParentId,
        conditionalMatchValue,
        dynamicSource,
      } = questionData;

      if (!title || !questionType) {
        return NextResponse.json({ error: 'Title and question type are required' }, { status: 400 });
      }

      const count = await prisma.questionnaireQuestion.count({
        where: { questionnaireId },
      });

      const questionId = `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

      const newQ = await prisma.questionnaireQuestion.create({
        data: {
          questionnaireId,
          questionId,
          title,
          description: description || null,
          questionType,
          isRequired: Boolean(isRequired),
          options: options.length > 0 ? options : undefined,
          conditionalParentId: conditionalParentId || null,
          conditionalMatchValue: conditionalMatchValue || null,
          dynamicSource: dynamicSource || null,
          displayOrder: count + 1,
        },
      });

      logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'CREATE',
        entity: 'QuestionnaireQuestion',
        entityId: newQ.id,
        newValue: newQ,
      });

      return NextResponse.json({ success: true, question: newQ });
    }

    // Action 2: Update existing question
    if (action === 'UPDATE_QUESTION') {
      const {
        id,
        title,
        description,
        questionType,
        isRequired,
        options,
        conditionalParentId,
        conditionalMatchValue,
        dynamicSource,
        displayOrder,
      } = questionData;

      const updated = await prisma.questionnaireQuestion.update({
        where: { id },
        data: {
          title: title ? title.trim() : undefined,
          description: description !== undefined ? description : undefined,
          questionType: questionType || undefined,
          isRequired: isRequired !== undefined ? Boolean(isRequired) : undefined,
          options: options !== undefined ? (options.length > 0 ? options : undefined) : undefined,
          conditionalParentId: conditionalParentId !== undefined ? conditionalParentId : undefined,
          conditionalMatchValue: conditionalMatchValue !== undefined ? conditionalMatchValue : undefined,
          dynamicSource: dynamicSource !== undefined ? dynamicSource : undefined,
          displayOrder: displayOrder !== undefined ? Number(displayOrder) : undefined,
        },
      });

      logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'UPDATE',
        entity: 'QuestionnaireQuestion',
        entityId: updated.id,
        newValue: updated,
      });

      return NextResponse.json({ success: true, question: updated });
    }

    // Action 3: Delete / Archive Question
    if (action === 'DELETE_QUESTION') {
      const { id } = questionData;
      await prisma.questionnaireQuestion.delete({
        where: { id },
      });

      logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'DELETE',
        entity: 'QuestionnaireQuestion',
        entityId: id,
      });

      return NextResponse.json({ success: true, message: 'Question removed successfully' });
    }

    // Action 4: Update questionnaire metadata
    if (action === 'UPDATE_QUESTIONNAIRE') {
      const { id, title, description, isActive } = questionnaireData;
      const updatedQ = await prisma.questionnaire.update({
        where: { id },
        data: {
          title: title ? title.trim() : undefined,
          description: description !== undefined ? description : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        },
      });

      return NextResponse.json({ success: true, questionnaire: updatedQ });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin questionnaires POST error:', error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}
