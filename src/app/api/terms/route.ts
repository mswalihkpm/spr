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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Term ID is required.' }, { status: 400 });
    }

    const existing = await prisma.term.findUnique({
      where: { id },
      include: { _count: { select: { performanceRecords: true, exams: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Assessment term not found.' }, { status: 404 });
    }

    if (existing._count.performanceRecords > 0) {
      return NextResponse.json(
        { error: `Cannot delete term with ${existing._count.performanceRecords} associated performance score records.` },
        { status: 400 }
      );
    }

    // Delete child exams if no scores attached
    await prisma.exam.deleteMany({ where: { termId: id } });
    await prisma.term.delete({ where: { id } });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'DELETE',
      entity: 'Term',
      entityId: id,
      previousValue: existing,
    });

    return NextResponse.json({ success: true, message: 'Assessment term deleted successfully.' });
  } catch (error: any) {
    console.error('Delete term error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete assessment term.' }, { status: 500 });
  }
}
