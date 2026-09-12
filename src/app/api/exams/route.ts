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
    const { name, categoryId, termId, academicYearId, maxScore, targetScore } = body;

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
        maxScore: maxScore !== undefined && maxScore !== null ? Number(maxScore) : 100.0,
        targetScore: targetScore !== undefined && targetScore !== null ? Number(targetScore) : 100.0,
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
    const { id, name, categoryId, termId, maxScore, targetScore } = body;

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
        maxScore: maxScore !== undefined && maxScore !== null ? Number(maxScore) : undefined,
        targetScore: targetScore !== undefined && targetScore !== null ? Number(targetScore) : undefined,
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
    const idParam = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body not JSON or empty
    }

    const idsSet = new Set<string>();

    if (idParam) idsSet.add(idParam.trim());
    if (idsParam) idsParam.split(',').forEach((s) => s.trim() && idsSet.add(s.trim()));
    if (body.id) idsSet.add(String(body.id).trim());
    if (Array.isArray(body.ids)) {
      body.ids.forEach((s: any) => s && idsSet.add(String(s).trim()));
    } else if (typeof body.ids === 'string') {
      body.ids.split(',').forEach((s: string) => s.trim() && idsSet.add(s.trim()));
    }
    if (Array.isArray(body.examIds)) {
      body.examIds.forEach((s: any) => s && idsSet.add(String(s).trim()));
    }

    const idsToDelete = Array.from(idsSet);

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'Exam ID(s) are required for deletion.' }, { status: 400 });
    }

    const existingExams = await prisma.exam.findMany({
      where: { id: { in: idsToDelete } },
      select: { id: true },
    });

    if (existingExams.length === 0) {
      return NextResponse.json({ success: true, message: 'Exams already removed.' });
    }

    const validIds = existingExams.map((e) => e.id);

    await prisma.$transaction([
      prisma.performanceRecord.deleteMany({ where: { examId: { in: validIds } } }),
      prisma.exam.deleteMany({ where: { id: { in: validIds } } }),
    ]);

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'BULK_DELETE',
      entity: 'Exam',
      newValue: { count: validIds.length, ids: validIds },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${validIds.length} exam(s).`,
      count: validIds.length,
      deletedCount: validIds.length,
    });
  } catch (error: any) {
    console.error('Delete exam error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete exam.' }, { status: 500 });
  }
}

