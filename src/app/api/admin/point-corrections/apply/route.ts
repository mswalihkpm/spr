import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { invalidateEngineCache } from '@/lib/spr-engine';
import { Decimal } from '@prisma/client/runtime/library';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { studentId, reasonId, action, notes } = body;

    if (!studentId || !reasonId || !action || (action !== 'ADD' && action !== 'REDUCE')) {
      return NextResponse.json(
        { error: 'Student ID, Reason ID, and action (ADD or REDUCE) are required.' },
        { status: 400 }
      );
    }

    // 1. Fetch reason
    const reason = await prisma.pointCorrectionReason.findUnique({
      where: { id: reasonId },
    });

    if (!reason) {
      return NextResponse.json({ error: 'Reason not found.' }, { status: 404 });
    }

    // 2. Fetch student
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, fullName: true, sprStudentId: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    const basePoint = Number(reason.basePoint);
    const pointDelta = action === 'ADD' ? basePoint : -basePoint;

    // 3. Insert adjustment record
    const adjustment = await prisma.studentPointAdjustment.create({
      data: {
        studentId: student.id,
        reasonId: reason.id,
        points: new Decimal(pointDelta.toFixed(2)),
        notes: notes?.trim() || null,
        createdById: user.id,
      },
    });

    // 4. Invalidate engine cache so student's total SPR and dossier update immediately
    invalidateEngineCache();

    // 5. Query updated points for this reason and overall
    const allAdjustments = await prisma.studentPointAdjustment.findMany({
      where: { studentId: student.id },
      select: { reasonId: true, points: true },
    });

    let pointsForReason = 0;
    let totalAdjustment = 0;
    for (const adj of allAdjustments) {
      const p = Number(adj.points);
      totalAdjustment += p;
      if (adj.reasonId === reasonId) {
        pointsForReason += p;
      }
    }

    // Log administrative action
    await logAuditAction({
      userId: user.id,
      userName: user.name,
      action: action === 'ADD' ? 'ADD_STUDENT_POINTS' : 'REDUCE_STUDENT_POINTS',
      entity: 'StudentPointAdjustment',
      entityId: adjustment.id,
      details: {
        studentId: student.id,
        studentName: student.fullName,
        sprStudentId: student.sprStudentId,
        reasonId: reason.id,
        reasonTitle: reason.title,
        basePoint,
        appliedDelta: pointDelta,
        newPointsForReason: pointsForReason,
        newTotalAdjustment: totalAdjustment,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: `${action === 'ADD' ? `+${basePoint}` : `-${basePoint}`} points successfully recorded for ${student.fullName}.`,
      studentId: student.id,
      pointsForReason: Number(pointsForReason.toFixed(2)),
      totalAdjustment: Number(totalAdjustment.toFixed(2)),
      appliedDelta: pointDelta,
    });
  } catch (error: any) {
    console.error('Apply point adjustment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to apply point adjustment.' },
      { status: 500 }
    );
  }
}
