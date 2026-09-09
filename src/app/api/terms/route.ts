export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

// GET all terms
export async function GET(req: NextRequest) {
  try {
    const terms = await prisma.term.findMany({
      include: {
        academicYear: true,
        exams: true,
        _count: {
          select: {
            performanceRecords: true,
            exams: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ terms });
  } catch (error: any) {
    console.error('Fetch terms error:', error);
    return NextResponse.json({ error: 'Failed to fetch assessment terms.' }, { status: 500 });
  }
}

// POST create a new term
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { name, code, academicYearId, isCurrent } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Assessment term name is required.' }, { status: 400 });
    }

    let yearId = academicYearId;
    if (!yearId) {
      const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } })
        || await prisma.academicYear.findFirst();
      yearId = currentYear?.id;
    }

    const termCode = (code || name).toUpperCase().replace(/\s+/g, '_').slice(0, 20);

    // If set as current, unset other terms
    if (isCurrent && yearId) {
      await prisma.term.updateMany({
        where: { academicYearId: yearId },
        data: { isCurrent: false },
      });
    }

    const term = await prisma.term.create({
      data: {
        name: name.trim(),
        code: termCode,
        academicYearId: yearId,
        isCurrent: Boolean(isCurrent),
      },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'CREATE',
      entity: 'Term',
      entityId: term.id,
      newValue: term,
    });

    return NextResponse.json({ success: true, term });
  } catch (error: any) {
    console.error('Create term error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create assessment term.' }, { status: 500 });
  }
}

// PUT update an existing term
export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { id, name, code, isCurrent } = body;

    if (!id) {
      return NextResponse.json({ error: 'Term ID is required.' }, { status: 400 });
    }

    const existing = await prisma.term.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Assessment term not found.' }, { status: 404 });
    }

    if (isCurrent && existing.academicYearId) {
      await prisma.term.updateMany({
        where: { academicYearId: existing.academicYearId },
        data: { isCurrent: false },
      });
    }

    const updated = await prisma.term.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        code: code !== undefined ? code.trim().toUpperCase() : undefined,
        isCurrent: isCurrent !== undefined ? Boolean(isCurrent) : undefined,
      },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'UPDATE',
      entity: 'Term',
      entityId: id,
      previousValue: existing,
      newValue: updated,
    });

    return NextResponse.json({ success: true, term: updated });
  } catch (error: any) {
    console.error('Update term error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update assessment term.' }, { status: 500 });
  }
}

// DELETE an assessment term
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
    if (Array.isArray(body.termIds)) {
      body.termIds.forEach((s: any) => s && idsSet.add(String(s).trim()));
    }

    const idsToDelete = Array.from(idsSet);

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'Term ID(s) are required for deletion.' }, { status: 400 });
    }

    const existingTerms = await prisma.term.findMany({
      where: { id: { in: idsToDelete } },
      select: { id: true },
    });

    if (existingTerms.length === 0) {
      return NextResponse.json({ success: true, message: 'Assessment terms already removed.' });
    }

    const validIds = existingTerms.map((t) => t.id);
    const exams = await prisma.exam.findMany({ where: { termId: { in: validIds } }, select: { id: true } });
    const examIds = exams.map((e) => e.id);

    const ops: any[] = [
      prisma.performanceRecord.deleteMany({ where: { termId: { in: validIds } } }),
    ];
    if (examIds.length > 0) {
      ops.push(prisma.performanceRecord.deleteMany({ where: { examId: { in: examIds } } }));
      ops.push(prisma.exam.deleteMany({ where: { id: { in: examIds } } }));
    }
    ops.push(prisma.term.deleteMany({ where: { id: { in: validIds } } }));

    await prisma.$transaction(ops);

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'BULK_DELETE',
      entity: 'Term',
      newValue: { count: validIds.length, ids: validIds },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${validIds.length} assessment term(s).`,
      count: validIds.length,
      deletedCount: validIds.length,
    });
  } catch (error: any) {
    console.error('Delete term error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete assessment term.' }, { status: 500 });
  }
}

