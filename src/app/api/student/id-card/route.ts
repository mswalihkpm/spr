export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateStudentRequest } from '@/lib/auth';
import { getOrCreateStudentQrToken, generateQrDataUrl, generate8DigitSprId } from '@/lib/qr-service';
import { formatGoogleDriveDirectUrl } from '@/lib/google-drive';

export async function GET(req: NextRequest) {
  const { student, errorResponse } = await authenticateStudentRequest(req);
  if (errorResponse || !student) return errorResponse;

  try {
    const studentRecord = await prisma.student.findUnique({
      where: { id: student.studentId },
      include: {
        class: { select: { id: true, name: true } },
        school: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
        questionnaireResponses: {
          where: {
            questionnaire: {
              OR: [
                { code: 'PERSONAL_FAMILY' },
                { title: { contains: 'Personal', mode: 'insensitive' } },
                { title: { contains: 'Family', mode: 'insensitive' } },
              ],
            },
          },
          select: {
            answers: true,
            status: true,
          },
          take: 1,
        },
      },
    });

    if (!studentRecord) {
      return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
    }

    // Extract questionnaire answers
    const pfAnswers = (studentRecord.questionnaireResponses?.[0]?.answers &&
      typeof studentRecord.questionnaireResponses[0].answers === 'object')
      ? (studentRecord.questionnaireResponses[0].answers as Record<string, any>)
      : {};

    const findAns = (keywords: string[]): string | null => {
      for (const kw of keywords) {
        const v = pfAnswers[kw];
        if (typeof v === 'string' && v.trim()) return v.trim();
      }
      for (const [k, val] of Object.entries(pfAnswers)) {
        if (typeof val === 'string' && val.trim()) {
          const lk = k.toLowerCase();
          if (keywords.some((kw) => lk.includes(kw.toLowerCase()))) {
            return val.trim();
          }
        }
      }
      return null;
    };

    const resolvedFather = studentRecord.fatherName || findAns(['father_name', 'father']) || null;
    const resolvedPlace = studentRecord.place || findAns(['place', 'locality']) || null;
    const resolvedDistrict = studentRecord.district || findAns(['district']) || null;
    const resolvedPhone =
      studentRecord.studentPhone ||
      findAns(['student_phone', 'student_contact']) ||
      studentRecord.guardianPhone ||
      findAns(['guardian_phone', 'guardian_contact', 'parent_phone']) ||
      null;
    const resolvedEmail = studentRecord.studentEmail || findAns(['student_email', 'email']) || null;

    // Get or create permanent secure QR token
    const { qrToken, qrPayload } = await getOrCreateStudentQrToken(studentRecord.id);
    const qrDataUrl = await generateQrDataUrl(qrPayload);

    const rawPhoto = studentRecord.photoUrl || (student as any)?.photoUrl || null;
    const resolvedPhoto = formatGoogleDriveDirectUrl(rawPhoto, 400) || rawPhoto;
    const resolvedSprId = studentRecord.sprStudentId || student.sprStudentId || 'SPR0000';
    const eightDigitSprId = generate8DigitSprId(resolvedSprId, studentRecord.studentId);

    const idCardData = {
      sprId: resolvedSprId,
      eightDigitSprId,
      studentCode: studentRecord.studentId,
      fullName: studentRecord.fullName || (student as any).name || (student as any).fullName || 'Student Name',
      className: studentRecord.class?.name || student.className || 'Assigned Class',
      division: studentRecord.division || student.division || 'A',
      academicYear: '2026-27',
      schoolName: studentRecord.school?.name || "Ma'din School of Excellence",
      photoUrl: resolvedPhoto,
      fatherName: resolvedFather || '—',
      place: resolvedPlace || '—',
      district: resolvedDistrict || '—',
      location: [resolvedPlace, resolvedDistrict].filter(Boolean).join(', ') || '—',
      phone: resolvedPhone || '—',
      email: resolvedEmail || '—',
      qrToken,
      qrPayload,
      qrDataUrl,
      issueDate: new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    };

    return NextResponse.json({
      success: true,
      idCard: idCardData,
    });
  } catch (err: any) {
    console.error('Error generating student ID card data:', err);
    return NextResponse.json({ error: 'Failed to generate Digital ID card.' }, { status: 500 });
  }
}
