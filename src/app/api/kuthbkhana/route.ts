export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { invalidateEngineCache } from '@/lib/spr-engine';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'VIEWER');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    // Find Kuthbkhana subcategory
    let kuthbkhanaSub = await prisma.subcategory.findFirst({
      where: {
        OR: [
          { code: 'KUTHBKHANA' },
          { name: { contains: 'Kuthbkhana', mode: 'insensitive' } },
        ],
      },
    });

    if (!kuthbkhanaSub) {
      const libraryCat = await prisma.category.findFirst({
        where: { OR: [{ code: 'LIBRARY' }, { name: { contains: 'Library', mode: 'insensitive' } }] },
      });
      if (libraryCat) {
        kuthbkhanaSub = await prisma.subcategory.create({
          data: {
            categoryId: libraryCat.id,
            name: 'Kuthbkhana',
            code: 'KUTHBKHANA',
            logoUrl: '/kuthbkhana-logo.png',
            maxScore: 100,
            weight: 1.0,
            active: true,
          },
        });
      }
    }

    const whereClause: any = {
      subcategoryId: kuthbkhanaSub?.id,
    };

    if (search) {
      whereClause.OR = [
        { student: { fullName: { contains: search, mode: 'insensitive' } } },
        { student: { studentId: { contains: search, mode: 'insensitive' } } },
        { remarks: { contains: search, mode: 'insensitive' } },
      ];
    }

    const records = await prisma.performanceRecord.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            class: true,
            school: true,
          },
        },
        subcategory: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({
      records,
      subcategoryId: kuthbkhanaSub?.id,
      totalCount: records.length,
    });
  } catch (error: any) {
    console.error('Kuthbkhana GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch Kuthbkhana records.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'KUTHBKHANA_ADMIN');
    if (errorResponse || !user) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { studentId, kithabName, points, date, notes } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'Please select a student.' }, { status: 400 });
    }

    if (!kithabName || !kithabName.trim()) {
      return NextResponse.json({ error: 'Please enter the Kithab name.' }, { status: 400 });
    }

    const numericPoints = parseFloat(points);
    if (isNaN(numericPoints) || numericPoints < 0) {
      return NextResponse.json({ error: 'Please provide a valid numerical points value.' }, { status: 400 });
    }

    // Resolve student
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    // Resolve Library Category & Kuthbkhana Subcategory
    let libraryCat = await prisma.category.findFirst({
      where: { OR: [{ code: 'LIBRARY' }, { name: { contains: 'Library', mode: 'insensitive' } }] },
    });

    if (!libraryCat) {
      libraryCat = await prisma.category.create({
        data: {
          code: 'LIBRARY',
          name: 'Library & Reading',
          defaultWeight: 1.2,
          isSystem: true,
        },
      });
    }

    let kuthbkhanaSub = await prisma.subcategory.findFirst({
      where: {
        OR: [
          { code: 'KUTHBKHANA' },
          { name: { contains: 'Kuthbkhana', mode: 'insensitive' } },
        ],
      },
    });

    if (!kuthbkhanaSub) {
      kuthbkhanaSub = await prisma.subcategory.create({
        data: {
          categoryId: libraryCat.id,
          name: 'Kuthbkhana',
          code: 'KUTHBKHANA',
          logoUrl: '/kuthbkhana-logo.png',
          maxScore: 100,
          weight: 1.0,
          active: true,
        },
      });
    }

    const recordDate = date ? new Date(date) : new Date();

    const record = await prisma.performanceRecord.create({
      data: {
        studentId: student.id,
        categoryId: libraryCat.id,
        subcategoryId: kuthbkhanaSub.id,
        academicYearId: student.academicYearId,
        obtainedScore: numericPoints,
        maxScore: 100,
        percentage: numericPoints,
        remarks: kithabName.trim() + (notes ? ` - ${notes.trim()}` : ''),
        date: recordDate,
        createdById: user.id,
      },
      include: {
        student: {
          include: { class: true },
        },
        subcategory: true,
      },
    });

    invalidateEngineCache();

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: 'CREATE',
      entity: 'KuthbkhanaRecord',
      entityId: record.id,
      newValue: {
        studentName: student.fullName,
        kithabName,
        points: numericPoints,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully logged "${kithabName}" (+${numericPoints} pts) for ${student.fullName}!`,
      record,
    });
  } catch (error: any) {
    console.error('Kuthbkhana POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add Kuthbkhana record.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'KUTHBKHANA_ADMIN');
    if (errorResponse || !user) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, studentId, kithabName, points, date, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Record ID is required.' }, { status: 400 });
    }

    const existing = await prisma.performanceRecord.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
    }

    // Role check: Only ADMIN, SUPER_ADMIN or creator can edit
    const isMainAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
    if (!isMainAdmin && existing.createdById !== user.id) {
      return NextResponse.json({ error: 'You only have permission to edit records you created.' }, { status: 403 });
    }

    const numericPoints = points !== undefined ? parseFloat(points) : existing.obtainedScore;

    const updated = await prisma.performanceRecord.update({
      where: { id },
      data: {
        ...(studentId ? { studentId } : {}),
        obtainedScore: numericPoints,
        percentage: numericPoints,
        ...(kithabName ? { remarks: kithabName.trim() + (notes ? ` - ${notes.trim()}` : '') } : {}),
        ...(date ? { date: new Date(date) } : {}),
        updatedById: user.id,
      },
      include: {
        student: { include: { class: true } },
        subcategory: true,
      },
    });

    invalidateEngineCache();

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: 'UPDATE',
      entity: 'KuthbkhanaRecord',
      entityId: id,
      previousValue: existing,
      newValue: updated,
    });

    return NextResponse.json({
      success: true,
      message: 'Kuthbkhana record updated successfully.',
      record: updated,
    });
  } catch (error: any) {
    console.error('Kuthbkhana PUT error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update record.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse || !user) return errorResponse || NextResponse.json({ error: 'Unauthorized: Only main administrators can delete records.' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Record ID is required.' }, { status: 400 });
    }

    const existing = await prisma.performanceRecord.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
    }

    await prisma.performanceRecord.delete({
      where: { id },
    });

    invalidateEngineCache();

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: 'DELETE',
      entity: 'KuthbkhanaRecord',
      entityId: id,
      previousValue: existing,
    });

    return NextResponse.json({
      success: true,
      message: 'Kuthbkhana record deleted.',
    });
  } catch (error: any) {
    console.error('Kuthbkhana DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete record.' }, { status: 500 });
  }
}
