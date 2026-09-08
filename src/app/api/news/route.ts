export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

// GET all news/updates (Public with edge cache)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    const includeInactive = searchParams.get('all') === 'true';

    const whereClause: any = {};
    if (!includeInactive) {
      whereClause.active = true;
    }

    const news = await prisma.news.findMany({
      where: whereClause,
      take: limit,
      orderBy: { publishedAt: 'desc' },
    });

    return NextResponse.json(
      { news },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=45',
        },
      }
    );
  } catch (error: any) {
    console.error('Fetch news error:', error);
    return NextResponse.json({ error: 'Failed to fetch news updates.' }, { status: 500 });
  }
}

// POST create news item (ADMIN)
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { title, subtitle, body: newsBody, imageUrl, publishedAt, active } = body;

    if (!title || !title.trim() || !newsBody || !newsBody.trim()) {
      return NextResponse.json({ error: 'Title and news body are required.' }, { status: 400 });
    }

    const newsItem = await prisma.news.create({
      data: {
        title: title.trim(),
        subtitle: subtitle ? subtitle.trim() : null,
        body: newsBody.trim(),
        imageUrl: imageUrl || null,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'CREATE',
      entity: 'News',
      entityId: newsItem.id,
      newValue: newsItem,
    });

    return NextResponse.json({ success: true, news: newsItem });
  } catch (error: any) {
    console.error('Create news error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create news.' }, { status: 500 });
  }
}

// PUT update news item (ADMIN)
export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { id, title, subtitle, body: newsBody, imageUrl, publishedAt, active } = body;

    if (!id) {
      return NextResponse.json({ error: 'News ID is required.' }, { status: 400 });
    }

    const existing = await prisma.news.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'News record not found.' }, { status: 404 });
    }

    const updated = await prisma.news.update({
      where: { id },
      data: {
        ...(title ? { title: title.trim() } : {}),
        subtitle: subtitle !== undefined ? (subtitle ? subtitle.trim() : null) : undefined,
        body: newsBody !== undefined ? newsBody.trim() : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        ...(publishedAt ? { publishedAt: new Date(publishedAt) } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
      },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'UPDATE',
      entity: 'News',
      entityId: id,
      previousValue: existing,
      newValue: updated,
    });

    return NextResponse.json({ success: true, news: updated });
  } catch (error: any) {
    console.error('Update news error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update news.' }, { status: 500 });
  }
}

// DELETE news item (ADMIN)
export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'News ID is required.' }, { status: 400 });
    }

    const existing = await prisma.news.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: true, message: 'News item already removed.' });
    }

    await prisma.news.delete({ where: { id } });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'DELETE',
      entity: 'News',
      entityId: id,
      previousValue: existing,
    });

    return NextResponse.json({ success: true, message: 'News item deleted.' });
  } catch (error: any) {
    console.error('Delete news error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete news.' }, { status: 500 });
  }
}
