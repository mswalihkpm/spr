export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

// GET all exams
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const termId = searchParams.get('termId');

    const whereClause: any = {};
    if (categoryId) whereClause.categoryId = categoryId;
    if (termId) whereClause.termId = termId;

    const exams = await prisma.exam.findMany({
      where: whereClause,
      include: {
        category: true,
        term: true,
        academicYear: true,
        _count: { select: { performanceRecords: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ exams });
  } catch (error: any) {
    console.error('Fetch exams error:', error);
    return NextResponse.json({ error: 'Failed to fetch exams.' }, { status: 500 });
  }
}

// POST create a new exam
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { name, categoryId, termId, academicYearId } = body;

    if (!name || !categoryId) {
      return NextResponse.json({ error: 'Exam name and category are required.' }, { status: 400 });
    }

    let activeTermId = termId;
    if (!activeTermId) {
      const currentTerm = await prisma.term.findFirst({ where: { isCurrent: true } })
        || await prisma.term.findFirst();
      activeTermId = currentTerm?.id;
    }

    let activeYearId = academicYearId;
    if (!activeYearId) {
      const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } })
        || await prisma.academicYear.findFirst();
      activeYearId = currentYear?.id;
    }

    if (!activeTermId || !activeYearId) {
      return NextResponse.json({ error: 'Academic year and term must exist before creating an exam.' }, { status: 400 });
    }

    const exam = await prisma.exam.create({
      data: {
        name: name.trim(),
        categoryId,
        termId: activeTermId,
        academicYearId: activeYearId,
      },
      include: {
        category: true,
        term: true,
      },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'CREATE',
      entity: 'Exam',
      entityId: exam.id,
      newValue: exam,
    });

    return NextResponse.json({ success: true, exam });
  } catch (error: any) {
    console.error('Create exam error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create exam.' }, { status: 500 });
  }
}

// PUT update an exam
export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { id, name, categoryId, termId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Exam ID is required.' }, { status: 400 });
    }

    const existing = await prisma.exam.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Exam record not found.' }, { status: 404 });
    }

    const updated = await prisma.exam.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        categoryId: categoryId || undefined,
        termId: termId || undefined,
      },
      include: {
        category: true,
        term: true,
      },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'UPDATE',
      entity: 'Exam',
      entityId: id,
      previousValue: existing,
      newValue: updated,
    });

    return NextResponse.json({ success: true, exam: updated });
  } catch (error: any) {
    console.error('Update exam error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update exam.' }, { status: 500 });
  }
}

// DELETE an exam
export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Exam ID is required.' }, { status: 400 });
    }

    const existing = await prisma.exam.findUnique({
      where: { id },
      include: { _count: { select: { performanceRecords: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
    }

    if (existing._count.performanceRecords > 0) {
      return NextResponse.json(
        { error: `Cannot delete exam with ${existing._count.performanceRecords} associated student scores.` },
        { status: 400 }
      );
    }

    await prisma.exam.delete({ where: { id } });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'DELETE',
      entity: 'Exam',
      entityId: id,
      previousValue: existing,
    });

    return NextResponse.json({ success: true, message: 'Exam deleted successfully.' });
  } catch (error: any) {
    console.error('Delete exam error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete exam.' }, { status: 500 });
  }
}
