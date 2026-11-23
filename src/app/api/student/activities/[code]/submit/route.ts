import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateStudentRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const { student, errorResponse } = await authenticateStudentRequest(req);
  if (errorResponse || !student) return errorResponse;

  const { code } = params;

  try {
    const body = await req.json();
    const { answers } = body;

    const questionnaire = await prisma.questionnaire.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        questions: true,
      },
    });

    if (!questionnaire) {
      return NextResponse.json({ error: 'Questionnaire not found' }, { status: 404 });
    }

    const studentRecord = await prisma.student.findUnique({
      where: { id: student.studentId },
    });

    // Required questions validation
    const missingRequired: string[] = [];
    for (const q of questionnaire.questions) {
      if (q.isRequired) {
        // Check conditional visibility
        let isVisible = true;
        if (q.conditionalParentId && q.conditionalMatchValue) {
          const parentVal = answers[q.conditionalParentId];
          if (Array.isArray(parentVal)) {
            isVisible = parentVal.includes(q.conditionalMatchValue);
          } else {
            isVisible = parentVal === q.conditionalMatchValue;
          }
        }
        if (isVisible) {
          const val = answers[q.questionId];
          if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
            missingRequired.push(q.title);
          }
        }
      }
    }

    if (missingRequired.length > 0) {
      return NextResponse.json(
        {
          error: `Please answer all required questions before final submission. Missing: ${missingRequired.slice(0, 3).join(', ')}${missingRequired.length > 3 ? '...' : ''}`,
        },
        { status: 400 }
      );
    }

    // Execute atomic submission
    await prisma.$transaction(async (tx) => {
      // 1. Save questionnaire response as SUBMITTED
      await tx.questionnaireResponse.upsert({
        where: {
          studentId_questionnaireId: {
            studentId: student.studentId,
            questionnaireId: questionnaire.id,
          },
        },
        update: {
          answers: answers || {},
          progressPercent: 100,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          lastSavedAt: new Date(),
        },
        create: {
          questionnaireId: questionnaire.id,
          studentId: student.studentId,
          answers: answers || {},
          progressPercent: 100,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          lastSavedAt: new Date(),
        },
      });

      // 2. Personal & Family Questionnaire profile synchronization
      if (code.toUpperCase() === 'PERSONAL_FAMILY' && answers && typeof answers === 'object') {
        const findVal = (keywords: string[]): string | undefined => {
          for (const kw of keywords) {
            const v = answers[kw];
            if (typeof v === 'string' && v.trim()) return v.trim();
          }
          for (const [k, val] of Object.entries(answers)) {
            if (typeof val === 'string' && val.trim()) {
              const lk = k.toLowerCase();
              if (keywords.some((kw) => lk.includes(kw.toLowerCase()))) {
                return val.trim();
              }
            }
          }
          return undefined;
        };

        const resolvedFather = findVal(['father_name', 'father']);
        const resolvedMother = findVal(['mother_name', 'mother']);
        const resolvedHouse = findVal(['house_name', 'house', 'address']);
        const resolvedGuardianPhone = findVal(['guardian_phone', 'guardian_contact', 'parent_phone']);
        const resolvedStudentPhone = findVal(['student_phone', 'student_contact']);
        const resolvedStudentEmail = findVal(['student_email', 'email']);
        const resolvedPlace = findVal(['place', 'locality']);
        const resolvedDistrict = findVal(['district']);
        const resolvedResidential = findVal(['residential_status', 'residential', 'hostel']);
        const resolvedPreferredContact = findVal(['preferred_contact', 'contact_method']);

        await tx.student.update({
          where: { id: student.studentId },
          data: {
            fatherName: resolvedFather || undefined,
            motherName: resolvedMother || undefined,
            houseName: resolvedHouse || undefined,
            guardianPhone: resolvedGuardianPhone || undefined,
            studentPhone: resolvedStudentPhone || undefined,
            studentEmail: resolvedStudentEmail || undefined,
            place: resolvedPlace || undefined,
            district: resolvedDistrict || undefined,
            residentialStatus: resolvedResidential || undefined,
            preferredContact: resolvedPreferredContact || undefined,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      status: 'SUBMITTED',
      message: 'Questionnaire submitted successfully!',
    });
  } catch (err: any) {
    console.error('Error submitting questionnaire:', err);
    return NextResponse.json({ error: 'Failed to submit questionnaire' }, { status: 500 });
  }
}
