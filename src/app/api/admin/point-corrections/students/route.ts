import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'TEACHER');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const reasonId = searchParams.get('reasonId');
    const classId = searchParams.get('classId');
    const search = searchParams.get('search')?.trim() || '';

    // Fetch classes for class-wise filtering
    const classes = await prisma.academicClass.findMany({
      select: { id: true, name: true, numericGrade: true },
      orderBy: { numericGrade: 'asc' },
    });

    // Reason details
    let selectedReason: any = null;
    if (reasonId) {
      selectedReason = await prisma.pointCorrectionReason.findUnique({
        where: { id: reasonId },
      });

      // Authorization check for non-super admins
      if (selectedReason && user.role !== 'SUPER_ADMIN') {
        let isAssigned = false;
        if (selectedReason.assignedAdminIds) {
          try {
            const parsed = JSON.parse(selectedReason.assignedAdminIds);
            if (Array.isArray(parsed) && (parsed.includes(user.id) || parsed.includes(user.email))) {
              isAssigned = true;
            }
          } catch {
            if (selectedReason.assignedAdminIds.includes(user.id) || selectedReason.assignedAdminIds.includes(user.email)) {
              isAssigned = true;
            }
          }
        }
        if (!isAssigned) {
          return NextResponse.json({
            classes,
            students: [],
            reason: null,
            error: 'Not authorized for this reason card.',
          });
        }
      }
    }

    // Build student query filter
    const where: any = {
      status: 'ACTIVE',
    };

    if (classId && classId !== 'ALL') {
      where.classId = classId;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { sprStudentId: { contains: search, mode: 'insensitive' } },
        { studentId: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch students with their point adjustments
    const students = await prisma.student.findMany({
      where,
      select: {
        id: true,
        studentId: true,
        sprStudentId: true,
        fullName: true,
        division: true,
        photoUrl: true,
        class: {
          select: { id: true, name: true },
        },
        pointAdjustments: {
          select: {
            id: true,
            reasonId: true,
            points: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { class: { numericGrade: 'asc' } },
        { division: 'asc' },
        { fullName: 'asc' },
      ],
      take: 200,
    });

    const formattedStudents = students.map((s) => {
      let pointsForReason = 0;
      let totalAdjustment = 0;
      let positivePoints = 0;
      let negativePoints = 0;

      for (const adj of s.pointAdjustments) {
        const pts = Number(adj.points);
        totalAdjustment += pts;
        if (pts > 0) positivePoints += pts;
        else negativePoints += Math.abs(pts);

        if (reasonId && adj.reasonId === reasonId) {
          pointsForReason += pts;
        }
      }

      return {
        id: s.id,
        studentId: s.studentId,
        sprStudentId: s.sprStudentId,
        fullName: s.fullName,
        className: s.class?.name || 'Class',
        division: s.division,
        photoUrl: s.photoUrl,
        pointsForReason: Number(pointsForReason.toFixed(2)),
        totalAdjustment: Number(totalAdjustment.toFixed(2)),
        positivePoints: Number(positivePoints.toFixed(2)),
        negativePoints: Number(negativePoints.toFixed(2)),
        adjustmentsCount: s.pointAdjustments.length,
      };
    });

    return NextResponse.json({
      classes,
      reason: selectedReason
        ? {
            id: selectedReason.id,
            title: selectedReason.title,
            basePoint: Number(selectedReason.basePoint),
            description: selectedReason.description,
          }
        : null,
      students: formattedStudents,
    });
  } catch (error: any) {
    console.error('Fetch students for point corrections error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch students.' },
      { status: 500 }
    );
  }
}
