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

    const visibilitySetting = await prisma.systemSetting.findUnique({
      where: { key: 'QUESTIONNAIRES_STUDENT_VISIBILITY' },
    });

    return NextResponse.json({
      questionnaires,
      studentVisibility: visibilitySetting?.value || 'VISIBLE',
    });
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

    // Action 4: Create new questionnaire section
    if (action === 'CREATE_QUESTIONNAIRE') {
      const { title, description, category, code, displayOrder, isActive = true } = questionnaireData || {};

      if (!title || !title.trim()) {
        return NextResponse.json({ error: 'Section title is required' }, { status: 400 });
      }

      // Format or generate unique uppercase code
      let formattedCode = (code && code.trim())
        ? code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
        : title.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 30);

      if (!formattedCode) {
        formattedCode = `SECTION_${Date.now().toString(36).toUpperCase()}`;
      }

      const existingCode = await prisma.questionnaire.findUnique({
        where: { code: formattedCode },
      });
      if (existingCode) {
        formattedCode = `${formattedCode}_${Date.now().toString(36).toUpperCase().slice(-4)}`;
      }

      let order = displayOrder !== undefined ? Number(displayOrder) : null;
      if (order === null || isNaN(order)) {
        const maxOrder = await prisma.questionnaire.aggregate({
          _max: { displayOrder: true },
        });
        order = (maxOrder._max.displayOrder || 0) + 1;
      }

      const newQ = await prisma.questionnaire.create({
        data: {
          title: title.trim(),
          description: description ? description.trim() : '',
          category: category ? category.trim().toUpperCase() : 'GENERAL',
          code: formattedCode,
          displayOrder: order,
          isActive: Boolean(isActive),
        },
        include: {
          questions: true,
          _count: { select: { responses: true } },
        },
      });

      logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'CREATE',
        entity: 'Questionnaire',
        entityId: newQ.id,
        newValue: newQ,
      });

      return NextResponse.json({
        success: true,
        questionnaire: newQ,
        message: `Questionnaire section "${newQ.title}" created successfully!`,
      });
    }

    // Action 5: Update questionnaire metadata
    if (action === 'UPDATE_QUESTIONNAIRE') {
      const { id, title, description, category, code, displayOrder, isActive } = questionnaireData || {};
      if (!id) {
        return NextResponse.json({ error: 'Questionnaire ID is required' }, { status: 400 });
      }

      const existing = await prisma.questionnaire.findUnique({
        where: { id },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Questionnaire section not found' }, { status: 404 });
      }

      let formattedCode = undefined;
      if (code && code.trim()) {
        formattedCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        if (formattedCode !== existing.code) {
          const codeConflict = await prisma.questionnaire.findUnique({
            where: { code: formattedCode },
          });
          if (codeConflict && codeConflict.id !== id) {
            return NextResponse.json({ error: `Questionnaire code "${formattedCode}" is already in use.` }, { status: 400 });
          }
        }
      }

      const updatedQ = await prisma.questionnaire.update({
        where: { id },
        data: {
          title: title ? title.trim() : undefined,
          description: description !== undefined ? description.trim() : undefined,
          category: category ? category.trim().toUpperCase() : undefined,
          code: formattedCode,
          displayOrder: displayOrder !== undefined ? Number(displayOrder) : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        },
        include: {
          questions: { orderBy: { displayOrder: 'asc' } },
          _count: { select: { responses: true } },
        },
      });

      logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'UPDATE',
        entity: 'Questionnaire',
        entityId: updatedQ.id,
        previousValue: existing,
        newValue: updatedQ,
      });

      return NextResponse.json({
        success: true,
        questionnaire: updatedQ,
        message: `Questionnaire section "${updatedQ.title}" updated successfully.`,
      });
    }

    // Action 6: Delete questionnaire section
    if (action === 'DELETE_QUESTIONNAIRE') {
      const targetId = questionnaireId || questionnaireData?.id;
      if (!targetId) {
        return NextResponse.json({ error: 'Questionnaire ID is required for deletion' }, { status: 400 });
      }

      const targetQ = await prisma.questionnaire.findUnique({
        where: { id: targetId },
        include: {
          _count: { select: { questions: true, responses: true } },
        },
      });

      if (!targetQ) {
        return NextResponse.json({ error: 'Questionnaire section not found' }, { status: 404 });
      }

      await prisma.questionnaire.delete({
        where: { id: targetId },
      });

      logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'DELETE',
        entity: 'Questionnaire',
        entityId: targetId,
        previousValue: {
          title: targetQ.title,
          code: targetQ.code,
          questionsCount: targetQ._count.questions,
          responsesCount: targetQ._count.responses,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Questionnaire section "${targetQ.title}" and its ${targetQ._count.questions} question(s) have been deleted.`,
        deletedId: targetId,
      });
    }

    // Action 7: Toggle student questionnaires visibility
    if (action === 'TOGGLE_STUDENT_VISIBILITY') {
      const { visibility } = body;
      const validVisibility = visibility === 'HIDDEN' ? 'HIDDEN' : 'VISIBLE';
      await prisma.systemSetting.upsert({
        where: { key: 'QUESTIONNAIRES_STUDENT_VISIBILITY' },
        create: {
          key: 'QUESTIONNAIRES_STUDENT_VISIBILITY',
          value: validVisibility,
          description: 'Controls whether questionnaires are visible to students in the student portal',
        },
        update: {
          value: validVisibility,
        },
      });

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'TOGGLE_QUESTIONNAIRE_VISIBILITY',
        entity: 'SystemSetting',
        newValue: { visibility: validVisibility },
      });

      return NextResponse.json({ success: true, studentVisibility: validVisibility });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin questionnaires POST error:', error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}
