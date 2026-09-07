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

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (status) where.publicationStatus = status;
    if (studentId) where.studentId = studentId;

    const [submissions, categories] = await Promise.all([
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
    ]);

    return NextResponse.json({ submissions, categories });
  } catch (error: any) {
    console.error('Creative Hub fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch creative works.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { studentId, categoryId, title, content, score, maxScore, reviewer, remarks, publicationStatus, publicationLink, attachmentUrl, date } = body;

    if (!studentId || !categoryId || !title) {
      return NextResponse.json({ error: 'Student, Category, and Title are required.' }, { status: 400 });
    }

    const obtainedScore = Number(score) || 0;
    const maximum = Number(maxScore) || 100;
    const percentage = normalizeScoreToPercentage(obtainedScore, maximum);

    const submission = await prisma.creativeHubSubmission.create({
      data: {
        studentId,
        categoryId,
        title: title.trim(),
        content: content?.trim() || null,
        date: date ? new Date(date) : new Date(),
        score: obtainedScore,
        maxScore: maximum,
        percentage,
        reviewer: reviewer?.trim() || null,
        remarks: remarks?.trim() || null,
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
      message: 'Creative Hub work recorded successfully.',
    });
  } catch (error: any) {
    console.error('Create creative work error:', error);
    return NextResponse.json({ error: error.message || 'Failed to record creative work.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { id, title, content, score, maxScore, reviewer, remarks, publicationStatus, publicationLink, categoryId } = body;

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
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    let idsToDelete: string[] = [];
    try {
      const body = await req.json();
      if (body && Array.isArray(body.ids)) {
        idsToDelete = body.ids;
      }
    } catch {
      // Body not JSON or empty
    }

    if (id) {
      idsToDelete.push(id);
    }

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

