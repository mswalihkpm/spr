export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, studentName, className, rank, sprScore, reporterName, message } = body;

    if (!studentName || !reporterName || !message) {
      return NextResponse.json(
        { error: 'Student name, your name, and issue details are required.' },
        { status: 400 }
      );
    }

    const report = await prisma.studentReport.create({
      data: {
        studentId: studentId || null,
        studentName: studentName.trim(),
        className: className ? className.trim() : null,
        rank: typeof rank === 'number' ? rank : parseInt(rank) || null,
        sprScore: typeof sprScore === 'number' ? sprScore : parseFloat(sprScore) || null,
        reporterName: reporterName.trim(),
        message: message.trim(),
        status: 'PENDING',
      },
    });

    // Log public audit activity
    await logAuditAction({
      action: 'CREATE',
      entity: 'StudentReport',
      entityId: report.id,
      userName: `Reporter: ${reporterName.trim()}`,
      newValue: {
        student: studentName,
        reporter: reporterName,
        issue: message,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Report submitted successfully. The administrative team has been notified.',
      report,
    });
  } catch (error: any) {
    console.error('Submit report error:', error);
    return NextResponse.json({ error: 'Failed to submit report. Please try again.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'VIEWER');
    if (errorResponse) return errorResponse;

    const reports = await prisma.studentReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const pendingCount = await prisma.studentReport.count({
      where: { status: 'PENDING' },
    });

    return NextResponse.json({ reports, pendingCount });
  } catch (error: any) {
    console.error('Fetch reports error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { reportId, status, adminNotes } = body;

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required.' }, { status: 400 });
    }

    const updated = await prisma.studentReport.update({
      where: { id: reportId },
      data: {
        status: status || undefined,
        adminNotes: adminNotes !== undefined ? adminNotes : undefined,
      },
    });

    return NextResponse.json({ success: true, report: updated });
  } catch (error: any) {
    console.error('Update report error:', error);
    return NextResponse.json({ error: 'Failed to update report.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body empty or not JSON
    }

    const idsToDelete: string[] = [];
    if (id) idsToDelete.push(id);
    if (body.id) idsToDelete.push(body.id);
    if (body.reportId) idsToDelete.push(body.reportId);
    if (body.ids && Array.isArray(body.ids)) idsToDelete.push(...body.ids);

    if (body.clearResolved) {
      const deleteResult = await prisma.studentReport.deleteMany({
        where: { status: 'RESOLVED' },
      });

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'BULK_DELETE',
        entity: 'StudentReport',
        newValue: { clearedResolved: true, count: deleteResult.count },
      });

      return NextResponse.json({
        success: true,
        message: `Cleared ${deleteResult.count} resolved reports.`,
        count: deleteResult.count,
      });
    }

    if (body.all || body.clearAll) {
      const deleteResult = await prisma.studentReport.deleteMany();

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'BULK_DELETE',
        entity: 'StudentReport',
        newValue: { clearAll: true, count: deleteResult.count },
      });

      return NextResponse.json({
        success: true,
        message: `Deleted all ${deleteResult.count} reports.`,
        count: deleteResult.count,
      });
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'Report ID(s) required for deletion.' }, { status: 400 });
    }

    const deleteResult = await prisma.studentReport.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'DELETE',
      entity: 'StudentReport',
      newValue: { count: deleteResult.count, deletedIds: idsToDelete },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.count} report(s).`,
      count: deleteResult.count,
    });
  } catch (error: any) {
    console.error('Delete report error:', error);
    return NextResponse.json({ error: 'Failed to delete report.' }, { status: 500 });
  }
}

