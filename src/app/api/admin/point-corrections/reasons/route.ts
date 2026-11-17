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

    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    // Fetch all reasons
    const allReasons = await prisma.pointCorrectionReason.findMany({
      include: {
        _count: { select: { adjustments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // If user is not super admin, filter reasons to only those assigned to this admin
    const reasons = isSuperAdmin
      ? allReasons
      : allReasons.filter((r) => {
          if (!r.assignedAdminIds) return false;
          try {
            const parsed = JSON.parse(r.assignedAdminIds);
            if (Array.isArray(parsed)) {
              return parsed.includes(user.id) || parsed.includes(user.email);
            }
          } catch {
            return r.assignedAdminIds.includes(user.id) || r.assignedAdminIds.includes(user.email);
          }
          return false;
        });

    // If super admin, fetch all admin users so they can be selected for functioning
    let adminUsers: { id: string; name: string; email: string; role: string }[] = [];
    if (isSuperAdmin) {
      adminUsers = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: { name: 'asc' },
      });
    }

    const formatted = reasons.map((r) => {
      let assignedAdminIds: string[] = [];
      if (r.assignedAdminIds) {
        try {
          const parsed = JSON.parse(r.assignedAdminIds);
          if (Array.isArray(parsed)) assignedAdminIds = parsed;
        } catch {
          assignedAdminIds = r.assignedAdminIds.split(',').map((s) => s.trim()).filter(Boolean);
        }
      }

      return {
        id: r.id,
        title: r.title,
        basePoint: Number(r.basePoint),
        description: r.description,
        assignedAdminIds,
        adjustmentsCount: r._count.adjustments,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      reasons: formatted,
      adminUsers,
      isSuperAdmin,
      currentUser: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
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

    // Only Super Admins can create new reason cards
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only Super Administrators can create new reason cards.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, basePoint, description, assignedAdminIds } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Reason title is required.' }, { status: 400 });
    }

    const numBasePoint = Math.abs(Number(basePoint));
    if (isNaN(numBasePoint) || numBasePoint <= 0) {
      return NextResponse.json(
        { error: 'A valid positive base point is required (e.g. 1, 2, 5, 10).' },
        { status: 400 }
      );
    }

    let assignedAdminIdsStr: string | null = null;
    if (Array.isArray(assignedAdminIds)) {
      assignedAdminIdsStr = JSON.stringify(assignedAdminIds);
    }

    const reason = await prisma.pointCorrectionReason.create({
      data: {
        title: title.trim(),
        basePoint: new Decimal(numBasePoint.toFixed(2)),
        description: description?.trim() || null,
        assignedAdminIds: assignedAdminIdsStr,
      },
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: 'CREATE_POINT_CORRECTION_REASON',
      entity: 'PointCorrectionReason',
      entityId: reason.id,
      details: {
        title: reason.title,
        basePoint: numBasePoint,
        assignedAdminIds,
      },
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
        assignedAdminIds: Array.isArray(assignedAdminIds) ? assignedAdminIds : [],
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

    // Only Super Admins can edit reason cards
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only Super Administrators can edit point correction reasons.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, title, basePoint, description, assignedAdminIds } = body;

    if (!id || !title || !title.trim()) {
      return NextResponse.json({ error: 'Reason ID and title are required.' }, { status: 400 });
    }

    const numBasePoint = Math.abs(Number(basePoint));
    if (isNaN(numBasePoint) || numBasePoint <= 0) {
      return NextResponse.json({ error: 'A valid positive base point is required.' }, { status: 400 });
    }

    const updateData: any = {
      title: title.trim(),
      basePoint: new Decimal(numBasePoint.toFixed(2)),
      description: description !== undefined ? description?.trim() || null : undefined,
    };

    if (assignedAdminIds !== undefined) {
      updateData.assignedAdminIds = Array.isArray(assignedAdminIds) ? JSON.stringify(assignedAdminIds) : null;
    }

    const updated = await prisma.pointCorrectionReason.update({
      where: { id },
      data: updateData,
    });

    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: 'UPDATE_POINT_CORRECTION_REASON',
      entity: 'PointCorrectionReason',
      entityId: updated.id,
      details: {
        title: updated.title,
        basePoint: numBasePoint,
        assignedAdminIds,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    });

    let formattedAssigned: string[] = [];
    if (updated.assignedAdminIds) {
      try {
        const parsed = JSON.parse(updated.assignedAdminIds);
        if (Array.isArray(parsed)) formattedAssigned = parsed;
      } catch {
        formattedAssigned = updated.assignedAdminIds.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }

    return NextResponse.json({
      success: true,
      reason: {
        id: updated.id,
        title: updated.title,
        basePoint: Number(updated.basePoint),
        description: updated.description,
        assignedAdminIds: formattedAssigned,
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

    // Only Super Admins can delete reason cards
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only Super Administrators can delete point correction reasons.' },
        { status: 403 }
      );
    }

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
