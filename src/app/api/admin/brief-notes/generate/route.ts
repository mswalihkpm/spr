export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'TEACHER');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { templateId, studentId } = body;

    if (!templateId || !studentId) {
      return NextResponse.json({ error: 'Template ID and Student ID are required' }, { status: 400 });
    }

    const template = await prisma.studentBriefNoteTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        academicYear: true,
      },
    });
    if (!student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    // Fetch all questionnaire responses for this student
    const responses = await prisma.questionnaireResponse.findMany({
      where: { studentId },
    });

    const answersMap: Record<string, any> = {};
    for (const r of responses) {
      if (r.answers && typeof r.answers === 'object') {
        Object.assign(answersMap, r.answers);
      }
    }

    // Populate template sections
    const rawSections = (template.sections as any[]) || [];
    const populatedSections = rawSections.map((sec) => {
      const populatedFields = (sec.fields || []).map((f: any) => {
        let value = answersMap[f.questionId];

        // Fallbacks to standard student record fields if mapped
        if (value === undefined || value === null || value === '') {
          if (f.questionId === 'q1_father_name' || f.questionId === 'fatherName') value = student.fatherName;
          if (f.questionId === 'q2_mother_name' || f.questionId === 'motherName') value = student.motherName;
          if (f.questionId === 'q3_house_name' || f.questionId === 'houseName') value = student.houseName;
          if (f.questionId === 'q4_guardian_phone' || f.questionId === 'guardianPhone') value = student.guardianPhone;
          if (f.questionId === 'q5_student_phone' || f.questionId === 'studentPhone') value = student.studentPhone;
          if (f.questionId === 'q6_student_email' || f.questionId === 'studentEmail') value = student.studentEmail;
          if (f.questionId === 'q7_place' || f.questionId === 'place') value = student.place;
          if (f.questionId === 'q8_district' || f.questionId === 'district') value = student.district;
          if (f.questionId === 'q9_residential_status' || f.questionId === 'residentialStatus') value = student.residentialStatus;
        }

        let displayValue = 'Not specified';
        if (value !== undefined && value !== null && value !== '') {
          displayValue = Array.isArray(value) ? value.join(', ') : String(value);
        }

        return {
          label: f.label || f.title || f.questionId,
          questionId: f.questionId,
          value: displayValue,
        };
      });

      return {
        title: sec.title || 'Section',
        fields: populatedFields,
      };
    });

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
      },
      student: {
        id: student.id,
        fullName: student.fullName,
        sprStudentId: student.sprStudentId || student.studentId,
        className: student.class?.name || 'Class',
        academicYear: student.academicYear?.name || '',
      },
      sections: populatedSections,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Generate brief note error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate note' }, { status: 500 });
  }
}
