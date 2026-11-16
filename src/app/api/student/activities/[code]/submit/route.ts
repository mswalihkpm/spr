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

    if (code.toUpperCase() === 'PERSONAL_FAMILY' && studentRecord?.isProfileLocked) {
      return NextResponse.json({ error: 'Personal profile is already locked from editing' }, { status: 403 });
    }

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

      // 2. Personal & Family Questionnaire profile synchronization & locking
      if (code.toUpperCase() === 'PERSONAL_FAMILY') {
        await tx.student.update({
          where: { id: student.studentId },
          data: {
            fatherName: answers.q1_father_name ? String(answers.q1_father_name).trim() : undefined,
            motherName: answers.q2_mother_name ? String(answers.q2_mother_name).trim() : undefined,
            houseName: answers.q3_house_name ? String(answers.q3_house_name).trim() : undefined,
            guardianPhone: answers.q4_guardian_phone ? String(answers.q4_guardian_phone).trim() : undefined,
            studentPhone: answers.q5_student_phone ? String(answers.q5_student_phone).trim() : undefined,
            studentEmail: answers.q6_student_email ? String(answers.q6_student_email).trim() : undefined,
            place: answers.q7_place ? String(answers.q7_place).trim() : undefined,
            district: answers.q8_district ? String(answers.q8_district).trim() : undefined,
            residentialStatus: answers.q9_residential_status ? String(answers.q9_residential_status).trim() : undefined,
            preferredContact: answers.q10_preferred_contact ? String(answers.q10_preferred_contact).trim() : undefined,
            isProfileLocked: true, // Locking student editing
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
