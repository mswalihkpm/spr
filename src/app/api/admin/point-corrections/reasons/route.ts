import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { Decimal } from '@prisma/client/runtime/library';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'TEACHER');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const reasons = await prisma.pointCorrectionReason.findMany({
      include: {
        _count: { select: { adjustments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = reasons.map((r) => ({
      id: r.id,
      title: r.title,
      basePoint: Number(r.basePoint),
      description: r.description,
      adjustmentsCount: r._count.adjustments,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return NextResponse.json({ reasons: formatted });
  } catch (error: any) {
    console.error('Fetch point correction reasons error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch correction reasons.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { title, basePoint, description } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Reason title is required.' }, { status: 400 });
    }

    const numBasePoint = Math.abs(Number(basePoint));
    if (isNaN(numBasePoint) || numBasePoint <= 0) {
      return NextResponse.json({ error: 'A valid positive base point is required (e.g. 1, 2, 5, 10).' }, { status: 400 });
    }

    const reason = await prisma.pointCorrectionReason.create({
      data: {
        title: title.trim(),
        basePoint: new Decimal(numBasePoint.toFixed(2)),
        description: description?.trim() || null,
      },
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: 'CREATE_POINT_CORRECTION_REASON',
      entity: 'PointCorrectionReason',
      entityId: reason.id,
      details: { title: reason.title, basePoint: numBasePoint },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      reason: {
        id: reason.id,
        title: reason.title,
        basePoint: Number(reason.basePoint),
        description: reason.description,
      },
    });
  } catch (error: any) {
    console.error('Create point correction reason error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create correction reason.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, title, basePoint, description } = body;

    if (!id || !title || !title.trim()) {
      return NextResponse.json({ error: 'Reason ID and title are required.' }, { status: 400 });
    }

    const numBasePoint = Math.abs(Number(basePoint));
    if (isNaN(numBasePoint) || numBasePoint <= 0) {
      return NextResponse.json({ error: 'A valid positive base point is required.' }, { status: 400 });
    }

    const updated = await prisma.pointCorrectionReason.update({
      where: { id },
      data: {
        title: title.trim(),
        basePoint: new Decimal(numBasePoint.toFixed(2)),
        description: description !== undefined ? description?.trim() || null : undefined,
      },
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: 'UPDATE_POINT_CORRECTION_REASON',
      entity: 'PointCorrectionReason',
      entityId: updated.id,
      details: { title: updated.title, basePoint: numBasePoint },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      reason: {
        id: updated.id,
        title: updated.title,
        basePoint: Number(updated.basePoint),
        description: updated.description,
      },
    });
  } catch (error: any) {
    console.error('Update point correction reason error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update correction reason.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Reason ID is required.' }, { status: 400 });
    }

    const existing = await prisma.pointCorrectionReason.findUnique({
      where: { id },
      select: { title: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Reason not found.' }, { status: 404 });
    }

    await prisma.pointCorrectionReason.delete({
      where: { id },
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: 'DELETE_POINT_CORRECTION_REASON',
      entity: 'PointCorrectionReason',
      entityId: id,
      details: { title: existing.title },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: `Reason "${existing.title}" and its associated adjustments have been deleted.`,
    });
  } catch (error: any) {
    console.error('Delete point correction reason error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete correction reason.' },
      { status: 500 }
    );
  }
}
