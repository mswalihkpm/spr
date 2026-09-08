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
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
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
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
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
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID are required' }, { status: 400 });
    }

    if (type === 'MEDIA') {
      const existing = await prisma.publishedMedia.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ success: true, message: 'Already removed' });
      }

      await prisma.publishedMedia.update({
        where: { id },
        data: { active: false },
      });

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'DELETE',
        entity: 'PublishedMedia',
        entityId: id,
      });

      return NextResponse.json({ success: true, message: 'Published Media removed' });
    } else {
      const existing = await prisma.creativeHubCategory.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ success: true, message: 'Already removed' });
      }

      await prisma.creativeHubCategory.update({
        where: { id },
        data: { active: false },
      });

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'DELETE',
        entity: 'CreativeHubCategory',
        entityId: id,
      });

      return NextResponse.json({ success: true, message: 'Creative Wing / Form removed' });
    }
  } catch (error: any) {
    console.error('Delete creative master item error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete item' }, { status: 500 });
  }
}
