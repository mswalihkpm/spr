export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'TEACHER');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { templateId, studentId, mode, classId } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const template = await prisma.studentBriefNoteTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const rawSections = (template.sections as any[]) || [];
    const allFields: any[] = [];
    rawSections.forEach((sec) => {
      (sec.fields || []).forEach((f: any) => {
        allFields.push({
          label: f.label || f.title || f.questionId,
          questionId: f.questionId,
          sectionTitle: sec.title || 'General',
        });
      });
    });

    // -------------------------------------------------------------------------
    // MODE 1: ALL OVER MASTER TABLE VIEW (Across all students with class filter)
    // -------------------------------------------------------------------------
    if (mode === 'ALL' || studentId === 'ALL') {
      const studentWhere: any = { status: 'ACTIVE' };
      if (classId && classId !== 'ALL') {
        studentWhere.classId = classId;
      }

      const [enrolledStudents, classes, responses] = await Promise.all([
        prisma.student.findMany({
          where: studentWhere,
          include: {
            class: true,
            academicYear: true,
          },
          orderBy: { fullName: 'asc' },
        }),
        prisma.academicClass.findMany({
          where: { active: true },
          orderBy: { numericGrade: 'asc' },
        }),
        prisma.questionnaireResponse.findMany({
          select: {
            studentId: true,
            answers: true,
          },
        }),
      ]);

      const studentAnswersMap: Record<string, Record<string, any>> = {};
      for (const r of responses) {
        if (!studentAnswersMap[r.studentId]) {
          studentAnswersMap[r.studentId] = {};
        }
        if (r.answers && typeof r.answers === 'object') {
          Object.assign(studentAnswersMap[r.studentId], r.answers);
        }
      }

      const rows = enrolledStudents.map((st) => {
        const answersMap = studentAnswersMap[st.id] || {};
        const fieldValues: Record<string, string> = {};

        for (const f of allFields) {
          let value = answersMap[f.questionId];

          if (value === undefined || value === null || value === '') {
            if (f.questionId === 'q1_father_name' || f.questionId === 'fatherName') value = st.fatherName;
            if (f.questionId === 'q2_mother_name' || f.questionId === 'motherName') value = st.motherName;
            if (f.questionId === 'q3_house_name' || f.questionId === 'houseName') value = st.houseName;
            if (f.questionId === 'q4_guardian_phone' || f.questionId === 'guardianPhone') value = st.guardianPhone;
            if (f.questionId === 'q5_student_phone' || f.questionId === 'studentPhone') value = st.studentPhone;
            if (f.questionId === 'q6_student_email' || f.questionId === 'studentEmail') value = st.studentEmail;
            if (f.questionId === 'q7_place' || f.questionId === 'place') value = st.place;
            if (f.questionId === 'q8_district' || f.questionId === 'district') value = st.district;
            if (f.questionId === 'q9_residential_status' || f.questionId === 'residentialStatus') value = st.residentialStatus;
          }

          let displayValue = '—';
          if (value !== undefined && value !== null && value !== '') {
            displayValue = Array.isArray(value) ? value.join(', ') : String(value);
          }
          fieldValues[f.questionId] = displayValue;
        }

        return {
          studentId: st.id,
          sprStudentId: st.sprStudentId || st.studentId,
          fullName: st.fullName,
          className: st.class?.name || 'Class',
          classId: st.classId,
          fieldValues,
        };
      });

      return NextResponse.json({
        mode: 'ALL',
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
        },
        fields: allFields,
        students: rows,
        classes,
        totalStudents: rows.length,
        generatedAt: new Date().toISOString(),
      });
    }

    // -------------------------------------------------------------------------
    // MODE 2: INDIVIDUAL STUDENT BRIEF NOTE PROFILE
    // -------------------------------------------------------------------------
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
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

    const responses = await prisma.questionnaireResponse.findMany({
      where: { studentId },
    });

    const answersMap: Record<string, any> = {};
    for (const r of responses) {
      if (r.answers && typeof r.answers === 'object') {
        Object.assign(answersMap, r.answers);
      }
    }

    const populatedSections = rawSections.map((sec) => {
      const populatedFields = (sec.fields || []).map((f: any) => {
        let value = answersMap[f.questionId];

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
      mode: 'INDIVIDUAL',
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
    console.error('Error generating brief note:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate brief note' }, { status: 500 });
  }
}
