export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { normalizeScoreToPercentage, invalidateEngineCache } from '@/lib/spr-engine';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'VIEWER');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');
    const studentId = searchParams.get('studentId');
    const mediaId = searchParams.get('mediaId');

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (status) where.publicationStatus = status;
    if (studentId) where.studentId = studentId;
    if (mediaId) where.publishedMediaId = mediaId;

    const [submissions, categories, publishedMedia] = await Promise.all([
      prisma.creativeHubSubmission.findMany({
        where,
        include: {
          student: {
            include: {
              class: true,
              school: true,
            },
          },
          category: true,
        },
        orderBy: { date: 'desc' },
      }),
      prisma.creativeHubCategory.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      prisma.publishedMedia.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    ]);

    return NextResponse.json({ submissions, categories, publishedMedia });
  } catch (error: any) {
    console.error('Creative Hub fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch creative works.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'CREATIVE_HUB_ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const {
      studentId,
      categoryId,
      publishedMediaId,
      publishedMediaName,
      title,
      content,
      score,
      maxScore,
      reviewer,
      remarks,
      publicationStatus,
      publicationLink,
      attachmentUrl,
      date,
    } = body;

    if (!studentId || !categoryId) {
      return NextResponse.json({ error: 'Student and Creative Form/Wing are required.' }, { status: 400 });
    }

    // Fetch form and media to resolve weights and names
    const [category, media] = await Promise.all([
      prisma.creativeHubCategory.findUnique({ where: { id: categoryId } }),
      publishedMediaId ? prisma.publishedMedia.findUnique({ where: { id: publishedMediaId } }) : null,
    ]);

    const resolvedMediaName = media?.name || publishedMediaName || 'General Publication';
    const formWeight = category?.weight || 1.0;
    const mediaWeight = media?.weight || 1.0;

    // Direct score or calculated from weightage
    let obtainedScore = score !== undefined && score !== null && score !== '' ? Number(score) : 100 * formWeight * mediaWeight;
    const maximum = maxScore ? Number(maxScore) : 100;
    const percentage = Math.min(100, Math.round((obtainedScore / maximum) * 100 * 10) / 10);

    const submissionTitle = (title && title.trim())
      ? title.trim()
      : `${category?.name || 'Creative Work'} — ${resolvedMediaName}`;

    const submission = await prisma.creativeHubSubmission.create({
      data: {
        studentId,
        categoryId,
        publishedMediaId: media?.id || publishedMediaId || null,
        publishedMediaName: resolvedMediaName,
        title: submissionTitle,
        content: content?.trim() || null,
        date: date ? new Date(date) : new Date(),
        score: obtainedScore,
        maxScore: maximum,
        percentage,
        reviewer: reviewer?.trim() || null,
        remarks: remarks?.trim() || `Published in ${resolvedMediaName}`,
        publicationStatus: publicationStatus || 'PUBLISHED',
        publicationLink: publicationLink?.trim() || null,
        attachmentUrl: attachmentUrl?.trim() || null,
      },
      include: {
        student: true,
        category: true,
      },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'CREATE',
      entity: 'CreativeHubSubmission',
      entityId: submission.id,
      newValue: submission,
    });

    invalidateEngineCache();

    return NextResponse.json({
      success: true,
      submission,
      message: 'Creative Hub report recorded successfully.',
    });
  } catch (error: any) {
    console.error('Create creative work error:', error);
    return NextResponse.json({ error: error.message || 'Failed to record creative work.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'CREATIVE_HUB_ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const {
      id,
      title,
      content,
      score,
      maxScore,
      reviewer,
      remarks,
      publicationStatus,
      publicationLink,
      categoryId,
      publishedMediaId,
      publishedMediaName,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Submission ID is required.' }, { status: 400 });
    }

    const prev = await prisma.creativeHubSubmission.findUnique({ where: { id } });
    if (!prev) {
      return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    }

    const obtainedScore = score !== undefined ? Number(score) : prev.score;
    const maximum = maxScore !== undefined ? Number(maxScore) : prev.maxScore;
    const percentage = normalizeScoreToPercentage(obtainedScore, maximum);

    const updated = await prisma.creativeHubSubmission.update({
      where: { id },
      data: {
        ...(title ? { title: title.trim() } : {}),
        ...(content !== undefined ? { content: content?.trim() || null } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(publishedMediaId !== undefined ? { publishedMediaId } : {}),
        ...(publishedMediaName ? { publishedMediaName } : {}),
        ...(score !== undefined ? { score: obtainedScore, percentage } : {}),
        ...(maxScore !== undefined ? { maxScore: maximum, percentage } : {}),
        ...(reviewer !== undefined ? { reviewer: reviewer?.trim() || null } : {}),
        ...(remarks !== undefined ? { remarks: remarks?.trim() || null } : {}),
        ...(publicationStatus ? { publicationStatus } : {}),
        ...(publicationLink !== undefined ? { publicationLink: publicationLink?.trim() || null } : {}),
      },
      include: {
        student: true,
        category: true,
      },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'UPDATE',
      entity: 'CreativeHubSubmission',
      entityId: id,
      previousValue: prev,
      newValue: updated,
    });

    invalidateEngineCache();

    return NextResponse.json({
      success: true,
      submission: updated,
      message: 'Creative Hub work updated successfully.',
    });
  } catch (error: any) {
    console.error('Update creative work error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update creative work.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'CREATIVE_HUB_ADMIN');
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
    if (Array.isArray(body.submissionIds)) {
      body.submissionIds.forEach((s: any) => s && idsSet.add(String(s).trim()));
    }

    const idsToDelete = Array.from(idsSet);

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'Submission ID(s) are required for deletion.' }, { status: 400 });
    }

    const deleteResult = await prisma.creativeHubSubmission.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'DELETE',
      entity: 'CreativeHubSubmission',
      newValue: { count: deleteResult.count, ids: idsToDelete },
    });

    invalidateEngineCache();

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.count} creative work(s).`,
      count: deleteResult.count,
    });
  } catch (error: any) {
    console.error('Delete creative work error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete creative work.' }, { status: 500 });
  }
}
