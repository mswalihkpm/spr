export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'TEACHER');
    if (errorResponse) return errorResponse;

    const templates = await prisma.studentBriefNoteTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    // Also return available questionnaire questions for mapping
    const questionnaires = await prisma.questionnaire.findMany({
      include: {
        questions: {
          select: { id: true, questionId: true, title: true, questionType: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({ templates, questionnaires });
  } catch (error: any) {
    console.error('Brief notes GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch brief note templates' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { id, name, description, sections, isDefault } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    if (id) {
      // Update
      const updated = await prisma.studentBriefNoteTemplate.update({
        where: { id },
        data: {
          name: name.trim(),
          description: description || null,
          sections: sections || [],
          isDefault: Boolean(isDefault),
        },
      });

      logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'UPDATE',
        entity: 'StudentBriefNoteTemplate',
        entityId: updated.id,
      });

      return NextResponse.json({ success: true, template: updated });
    } else {
      // Create
      const created = await prisma.studentBriefNoteTemplate.create({
        data: {
          name: name.trim(),
          description: description || null,
          sections: sections || [],
          isDefault: Boolean(isDefault),
          createdById: user!.id,
        },
      });

      logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'CREATE',
        entity: 'StudentBriefNoteTemplate',
        entityId: created.id,
      });

      return NextResponse.json({ success: true, template: created });
    }
  } catch (error: any) {
    console.error('Brief notes POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save template' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });

    await prisma.studentBriefNoteTemplate.delete({ where: { id } });

    logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'DELETE',
      entity: 'StudentBriefNoteTemplate',
      entityId: id,
    });

    return NextResponse.json({ success: true, message: 'Template removed successfully' });
  } catch (error: any) {
    console.error('Brief notes DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete template' }, { status: 500 });
  }
}
