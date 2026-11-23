import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateStudentRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const { student, errorResponse } = await authenticateStudentRequest(req);
  if (errorResponse || !student) return errorResponse;

  const { code } = params;

  try {
    const questionnaire = await prisma.questionnaire.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        questions: {
          orderBy: { displayOrder: 'asc' },
        },
        responses: {
          where: { studentId: student.studentId },
        },
      },
    });

    if (!questionnaire) {
      return NextResponse.json({ error: 'Questionnaire not found' }, { status: 404 });
    }

    const studentRecord = await prisma.student.findUnique({
      where: { id: student.studentId },
      include: { class: true },
    });

    // Check if dynamic academic subjects are needed
    let activeSubjects: string[] = [];
    const hasDynamicSubjects = questionnaire.questions.some((q) => q.dynamicSource === 'ACADEMIC_SUBJECTS');
    if (hasDynamicSubjects) {
      const dbSubjects = await prisma.subject.findMany({
        select: { name: true },
        orderBy: { name: 'asc' },
      });
      activeSubjects = dbSubjects.map((s) => s.name);
      if (activeSubjects.length === 0) {
        activeSubjects = [
          'English',
          'Mathematics',
          'Science / Physics',
          'Chemistry',
          'Biology',
          'Social Science',
          'Malayalam',
          'Hindi',
          'Arabic',
          'Information Technology',
        ];
      }
    }

    // Format questions
    const formattedQuestions = questionnaire.questions.map((q) => {
      let options: string[] = [];
      if (q.dynamicSource === 'ACADEMIC_SUBJECTS') {
        options = activeSubjects;
      } else if (q.options) {
        try {
          options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        } catch {
          options = [];
        }
      }

      return {
        id: q.id,
        questionId: q.questionId,
        title: q.title,
        description: q.description,
        questionType: q.questionType,
        isRequired: q.isRequired,
        displayOrder: q.displayOrder,
        options,
        conditionalParentId: q.conditionalParentId,
        conditionalMatchValue: q.conditionalMatchValue,
        dynamicSource: q.dynamicSource,
      };
    });

    const response = questionnaire.responses[0] || null;
    let studentAnswers: Record<string, any> = {};
    if (response?.answers) {
      try {
        studentAnswers = typeof response.answers === 'string' ? JSON.parse(response.answers) : response.answers;
      } catch {
        studentAnswers = {};
      }
    } else if (code.toUpperCase() === 'PERSONAL_FAMILY' && studentRecord) {
      // Pre-fill from existing student record
      studentAnswers = {
        q1_father_name: studentRecord.fatherName || '',
        q2_mother_name: studentRecord.motherName || '',
        q3_house_name: studentRecord.houseName || '',
        q4_guardian_phone: studentRecord.guardianPhone || '',
        q5_student_phone: studentRecord.studentPhone || '',
        q6_student_email: studentRecord.studentEmail || '',
        q7_place: studentRecord.place || '',
        q8_district: studentRecord.district || '',
        q9_residential_status: studentRecord.residentialStatus || '',
        q10_preferred_contact: studentRecord.preferredContact || '',
      };
    }

    const isLocked = false;

    return NextResponse.json({
      success: true,
      questionnaire: {
        id: questionnaire.id,
        code: questionnaire.code,
        title: questionnaire.title,
        description: questionnaire.description,
        category: questionnaire.category,
        version: questionnaire.version,
      },
      questions: formattedQuestions,
      response: {
        status: isLocked ? 'LOCKED' : response?.status || 'NOT_STARTED',
        progressPercentage: response?.progressPercent || 0,
        answers: studentAnswers,
        isLocked,
        lastSavedAt: response?.lastSavedAt || null,
        submittedAt: response?.submittedAt || null,
      },
    });
  } catch (err: any) {
    console.error('Error fetching questionnaire details:', err);
    return NextResponse.json({ error: 'Failed to load questionnaire' }, { status: 500 });
  }
}
