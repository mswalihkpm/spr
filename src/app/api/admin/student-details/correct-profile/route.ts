import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
  if (errorResponse || !user) return errorResponse;

  try {
    const body = await req.json();
    const { studentId, updates, reason } = body;

    if (!studentId || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'studentId and updates object are required' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const allowedFields = [
      'fatherName',
      'motherName',
      'houseName',
      'guardianPhone',
      'studentPhone',
      'studentEmail',
      'place',
      'district',
      'residentialStatus',
      'preferredContact',
      'isProfileLocked',
    ];

    const logs: any[] = [];
    const fieldsToUpdate: any = {};

    for (const field of allowedFields) {
      if (field in updates) {
        const prevVal = (student as any)[field];
        const newVal = updates[field];
        if (prevVal !== newVal) {
          fieldsToUpdate[field] = newVal;
          logs.push({
            studentId,
            adminId: user.id,
            fieldName: field,
            previousValue: prevVal !== null && prevVal !== undefined ? String(prevVal) : null,
            newValue: newVal !== null && newVal !== undefined ? String(newVal) : null,
            reason: reason || 'Administrative correction',
          });
        }
      }
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return NextResponse.json({ success: true, message: 'No changes detected' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: studentId },
        data: fieldsToUpdate,
      });

      for (const log of logs) {
        await tx.profileCorrectionLog.create({
          data: log,
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully corrected ${Object.keys(fieldsToUpdate).length} field(s)`,
      updatedFields: fieldsToUpdate,
    });
  } catch (err: any) {
    console.error('Error applying profile correction:', err);
    return NextResponse.json({ error: 'Failed to correct student profile' }, { status: 500 });
  }
}
