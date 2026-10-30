export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest, verifyPassword } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, studentName, className, rank, sprScore, reporterName, reporterPassword, message } = body;

    if (!studentName || !reporterName || !message) {
      return NextResponse.json(
        { error: 'Target student name, your registered student name, and issue details are required.' },
        { status: 400 }
      );
    }

    const cleanReporterName = String(reporterName).trim();
    const cleanReporterPassword = String(reporterPassword || '').trim();

    if (!cleanReporterPassword) {
      return NextResponse.json(
        { error: 'Student Portal password is required to verify your identity before submitting a report.' },
        { status: 400 }
      );
    }

    // Authenticate reporter against registered student accounts
    const reportingStudent = await prisma.student.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [
          { sprStudentId: { equals: cleanReporterName, mode: 'insensitive' } },
          { studentId: { equals: cleanReporterName, mode: 'insensitive' } },
          { fullName: { equals: cleanReporterName, mode: 'insensitive' } },
        ],
      },
      include: {
        account: true,
        class: true,
      },
    });

    if (!reportingStudent || !reportingStudent.account) {
      return NextResponse.json(
        { error: `No registered student account found matching "${cleanReporterName}". Please enter your registered student name, SPR ID, or Student ID.` },
        { status: 401 }
      );
    }

    if (!reportingStudent.account.isActivated) {
      return NextResponse.json(
        { error: 'Your student account is not activated. Please activate your account first to submit reports.' },
        { status: 403 }
      );
    }

    if (reportingStudent.account.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: `Your student account is currently ${reportingStudent.account.status.toLowerCase()}. Please contact administration.` },
        { status: 403 }
      );
    }

    const isPasswordValid = await verifyPassword(cleanReporterPassword, reportingStudent.account.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid Student Portal password. Verification failed. Only authenticated students can report ranks.' },
        { status: 401 }
      );
    }

    const verifiedReporterLabel = `${reportingStudent.fullName} (${reportingStudent.sprStudentId || reportingStudent.studentId || (reportingStudent.class ? `Class ${reportingStudent.class.name}` : 'Student')})`;

    const report = await prisma.studentReport.create({
      data: {
        studentId: studentId || null,
        studentName: studentName.trim(),
        className: className ? className.trim() : null,
        rank: typeof rank === 'number' ? rank : parseInt(rank) || null,
        sprScore: typeof sprScore === 'number' ? sprScore : parseFloat(sprScore) || null,
        reporterName: verifiedReporterLabel,
        message: message.trim(),
        status: 'PENDING',
      },
    });

    // Log public audit activity
    await logAuditAction({
      action: 'CREATE',
      entity: 'StudentReport',
      entityId: report.id,
      userName: `Verified Student: ${verifiedReporterLabel}`,
      newValue: {
        student: studentName,
        reporter: verifiedReporterLabel,
        reporterStudentId: reportingStudent.id,
        issue: message,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Verified report submitted successfully. The administrative team has received your ticket.',
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
    const idParam = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body empty or not JSON
    }

    const idsSet = new Set<string>();
    if (idParam) idsSet.add(idParam.trim());
    if (idsParam) idsParam.split(',').forEach((s) => s.trim() && idsSet.add(s.trim()));
    if (body.id) idsSet.add(String(body.id).trim());
    if (body.reportId) idsSet.add(String(body.reportId).trim());
    if (Array.isArray(body.ids)) {
      body.ids.forEach((s: any) => s && idsSet.add(String(s).trim()));
    } else if (typeof body.ids === 'string') {
      body.ids.split(',').forEach((s: string) => s.trim() && idsSet.add(s.trim()));
    }

    const idsToDelete = Array.from(idsSet);

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

