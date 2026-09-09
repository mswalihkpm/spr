export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

// GET all Creative Wings (Categories) and Published Media
export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'VIEWER');
    if (errorResponse) return errorResponse;

    const [creativeForms, publishedMedia] = await Promise.all([
      prisma.creativeHubCategory.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
      prisma.publishedMedia.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({ creativeForms, publishedMedia });
  } catch (error: any) {
    console.error('Fetch creative hub master error:', error);
    return NextResponse.json({ error: 'Failed to fetch master data' }, { status: 500 });
  }
}

// POST create Creative Form or Published Media
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'CREATIVE_HUB_ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { type, name, code, weight, description } = body;

    if (!type || !name) {
      return NextResponse.json({ error: 'Type and Name are required' }, { status: 400 });
    }

    const weightVal = Number(weight) || 1.0;
    const generatedCode = (code || name).toUpperCase().replace(/[^A-Z0-9]/g, '_');

    if (type === 'MEDIA') {
      const created = await prisma.publishedMedia.create({
        data: {
          name: name.trim(),
          code: generatedCode,
          weight: weightVal,
          active: true,
        },
      });

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'CREATE',
        entity: 'PublishedMedia',
        entityId: created.id,
        newValue: created,
      });

      return NextResponse.json({ success: true, item: created });
    } else {
      const created = await prisma.creativeHubCategory.create({
        data: {
          name: name.trim(),
          code: generatedCode,
          weight: weightVal,
          active: true,
        },
      });

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'CREATE',
        entity: 'CreativeHubCategory',
        entityId: created.id,
        newValue: created,
      });

      return NextResponse.json({ success: true, item: created });
    }
  } catch (error: any) {
    console.error('Create creative master item error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create item' }, { status: 500 });
  }
}

// PUT update Creative Form or Published Media
export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'CREATIVE_HUB_ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { type, id, name, weight } = body;

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID are required' }, { status: 400 });
    }

    const weightVal = weight !== undefined ? Number(weight) : undefined;

    if (type === 'MEDIA') {
      const existing = await prisma.publishedMedia.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: 'Media not found' }, { status: 404 });
      }

      const updated = await prisma.publishedMedia.update({
        where: { id },
        data: {
          ...(name ? { name: name.trim() } : {}),
          ...(weightVal !== undefined ? { weight: weightVal } : {}),
        },
      });

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'UPDATE',
        entity: 'PublishedMedia',
        entityId: id,
        previousValue: existing,
        newValue: updated,
      });

      return NextResponse.json({ success: true, item: updated });
    } else {
      const existing = await prisma.creativeHubCategory.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: 'Creative Wing / Form not found' }, { status: 404 });
      }

      const updated = await prisma.creativeHubCategory.update({
        where: { id },
        data: {
          ...(name ? { name: name.trim() } : {}),
          ...(weightVal !== undefined ? { weight: weightVal } : {}),
        },
      });

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'UPDATE',
        entity: 'CreativeHubCategory',
        entityId: id,
        previousValue: existing,
        newValue: updated,
      });

      return NextResponse.json({ success: true, item: updated });
    }
  } catch (error: any) {
    console.error('Update creative master item error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update item' }, { status: 500 });
  }
}

// DELETE delete Creative Form or Published Media (Soft or Safe Delete)
export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'CREATIVE_HUB_ADMIN');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    let type = searchParams.get('type');
    const idParam = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body not JSON or empty
    }

    if (body.type) {
      type = body.type;
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

    const idsToDelete = Array.from(idsSet);

    if (!type || idsToDelete.length === 0) {
      return NextResponse.json({ error: 'Type and ID(s) are required for deletion.' }, { status: 400 });
    }

    if (type === 'MEDIA') {
      await prisma.publishedMedia.updateMany({
        where: { id: { in: idsToDelete } },
        data: { active: false },
      });

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'DELETE',
        entity: 'PublishedMedia',
        newValue: { count: idsToDelete.length, ids: idsToDelete },
      });

      return NextResponse.json({ success: true, message: 'Published Media removed', count: idsToDelete.length });
    } else {
      await prisma.creativeHubCategory.updateMany({
        where: { id: { in: idsToDelete } },
        data: { active: false },
      });

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'DELETE',
        entity: 'CreativeHubCategory',
        newValue: { count: idsToDelete.length, ids: idsToDelete },
      });

      return NextResponse.json({ success: true, message: 'Creative Wing / Form removed', count: idsToDelete.length });
    }
  } catch (error: any) {
    console.error('Delete creative master item error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete item' }, { status: 500 });
  }
}
