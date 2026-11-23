export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { getOrCreateStudentQrToken, generateQrDataUrl, generateStrong8DigitCode } from '@/lib/qr-service';
import { formatGoogleDriveDirectUrl } from '@/lib/google-drive';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApiRequest(req, 'TEACHER');
  if (errorResponse || !user) return errorResponse;

  const url = new URL(req.url);
  const classId = url.searchParams.get('classId') || '';
  const sortBy = url.searchParams.get('sortBy') || 'CLASS_THEN_NAME'; // CLASS_THEN_NAME | CLASS_THEN_SPR | NAME_ASC | SPR_ASC

  try {
    // 1. Fetch active students matching class filter
    const whereClause: any = { status: 'ACTIVE' };
    if (classId && classId !== 'ALL') {
      whereClause.classId = classId;
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        class: { select: { id: true, name: true, numericGrade: true } },
        school: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
        qrToken: true,
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

    // 2. Fetch all academic classes for dropdown
    const allClasses = await prisma.academicClass.findMany({
      select: { id: true, name: true, numericGrade: true },
      orderBy: { numericGrade: 'desc' },
    });

    // 3. Process each student into full ID Card payload
    const processedCards = await Promise.all(
      students.map(async (st) => {
        // Extract questionnaire answers as fallback
        const pfAnswers =
          st.questionnaireResponses?.[0]?.answers &&
          typeof st.questionnaireResponses[0].answers === 'object'
            ? (st.questionnaireResponses[0].answers as Record<string, any>)
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

        const resolvedFather = st.fatherName || findAns(['father_name', 'father']) || null;
        const resolvedPlace = st.place || findAns(['place', 'locality']) || null;
        const resolvedDistrict = st.district || findAns(['district']) || null;
        const resolvedPhone =
          st.studentPhone ||
          findAns(['student_phone', 'student_contact']) ||
          st.guardianPhone ||
          findAns(['guardian_phone', 'guardian_contact', 'parent_phone']) ||
          null;
        const resolvedEmail = st.studentEmail || findAns(['student_email', 'email']) || null;

        // Permanent QR token and QR data URL
        const { qrToken, qrPayload } = await getOrCreateStudentQrToken(st.id);
        const qrDataUrl = await generateQrDataUrl(qrPayload);

        const rawPhoto = st.photoUrl || null;
        const resolvedPhoto = formatGoogleDriveDirectUrl(rawPhoto, 400) || rawPhoto;
        const resolvedSprId = st.sprStudentId || 'SPR0000';
        const eightDigitSprId = generateStrong8DigitCode(st.id, resolvedSprId);

        return {
          id: st.id,
          sprId: resolvedSprId,
          eightDigitSprId,
          studentCode: st.studentId,
          fullName: st.fullName || 'Student Name',
          classId: st.classId,
          className: st.class?.name || 'Assigned Class',
          numericGrade: st.class?.numericGrade ?? 0,
          division: st.division || 'A',
          academicYear: '2026-27',
          schoolName: st.school?.name || "Ma'din School of Excellence",
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
      })
    );

    // 4. Sorting logic
    if (sortBy === 'CLASS_THEN_NAME') {
      // Sort primarily by class grade descending (Senior to Junior: +2, +1, 10, 9, 8), then by student name A-Z
      processedCards.sort((a, b) => {
        if (b.numericGrade !== a.numericGrade) {
          return b.numericGrade - a.numericGrade;
        }
        return (a.fullName || '').localeCompare(b.fullName || '', undefined, { sensitivity: 'base' });
      });
    } else if (sortBy === 'CLASS_THEN_SPR') {
      // Sort by class grade descending, then by SPR ID ascending
      processedCards.sort((a, b) => {
        if (b.numericGrade !== a.numericGrade) {
          return b.numericGrade - a.numericGrade;
        }
        return (a.sprId || '').localeCompare(b.sprId || '', undefined, { numeric: true });
      });
    } else if (sortBy === 'NAME_ASC') {
      // Overall alphabetical sort A-Z
      processedCards.sort((a, b) =>
        (a.fullName || '').localeCompare(b.fullName || '', undefined, { sensitivity: 'base' })
      );
    } else if (sortBy === 'SPR_ASC') {
      // Overall SPR ID sort ascending
      processedCards.sort((a, b) =>
        (a.sprId || '').localeCompare(b.sprId || '', undefined, { numeric: true })
      );
    }

    return NextResponse.json({
      success: true,
      count: processedCards.length,
      cards: processedCards,
      classes: allClasses,
      sortBy,
      generatedAt: new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    });
  } catch (err: any) {
    console.error('Error fetching bulk student ID cards:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch student ID cards in bulk.' },
      { status: 500 }
    );
  }
}
