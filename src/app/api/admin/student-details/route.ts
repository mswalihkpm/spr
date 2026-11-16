import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApiRequest(req, 'TEACHER');
  if (errorResponse || !user) return errorResponse;

  const url = new URL(req.url);
  const classId = url.searchParams.get('classId') || '';
  const search = url.searchParams.get('q') || '';
  const isProfileLockedParam = url.searchParams.get('locked');
  const questionnaireStatus = url.searchParams.get('qStatus'); // e.g. ALL_COMPLETED, INCOMPLETE

  try {
    const whereClause: any = {
      status: 'ACTIVE',
    };

    if (classId) {
      whereClause.classId = classId;
    }

    if (search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { sprStudentId: { contains: q, mode: 'insensitive' } },
        { studentId: { contains: q, mode: 'insensitive' } },
        { guardianPhone: { contains: q, mode: 'insensitive' } },
        { studentPhone: { contains: q, mode: 'insensitive' } },
        { studentEmail: { contains: q, mode: 'insensitive' } },
        { place: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (isProfileLockedParam === 'true') {
      whereClause.isProfileLocked = true;
    } else if (isProfileLockedParam === 'false') {
      whereClause.isProfileLocked = false;
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        class: true,
        school: true,
        questionnaireResponses: {
          select: {
            id: true,
            status: true,
            progressPercent: true,
            questionnaireId: true,
            questionnaire: {
              select: { code: true, title: true },
            },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const totalQuestionnairesCount = await prisma.questionnaire.count({ where: { isActive: true } });

    const formattedStudents = students.map((s) => {
      const completedResponses = s.questionnaireResponses.filter(
        (r) => r.status === 'SUBMITTED' || r.status === 'LOCKED'
      );
      const inProgressResponses = s.questionnaireResponses.filter(
        (r) => r.status === 'IN_PROGRESS' || r.status === 'READY_FOR_REVIEW'
      );

      return {
        id: s.id,
        sprStudentId: s.sprStudentId,
        studentId: s.studentId,
        fullName: s.fullName,
        className: s.class?.name || 'Unassigned',
        classId: s.classId,
        schoolName: s.school?.name || 'Main Campus',
        fatherName: s.fatherName || '',
        motherName: s.motherName || '',
        houseName: s.houseName || '',
        guardianPhone: s.guardianPhone || '',
        studentPhone: s.studentPhone || '',
        studentEmail: s.studentEmail || '',
        place: s.place || '',
        district: s.district || '',
        residentialStatus: s.residentialStatus || '',
        preferredContact: s.preferredContact || '',
        isProfileLocked: s.isProfileLocked,
        photoUrl: s.photoUrl || '',
        completedQuestionnairesCount: completedResponses.length,
        inProgressQuestionnairesCount: inProgressResponses.length,
        totalQuestionnairesCount,
        questionnaireCompletionRate:
          totalQuestionnairesCount > 0
            ? Math.round((completedResponses.length / totalQuestionnairesCount) * 100)
            : 0,
      };
    });

    let resultList = formattedStudents;
    if (questionnaireStatus === 'COMPLETED') {
      resultList = resultList.filter((s) => s.completedQuestionnairesCount === totalQuestionnairesCount);
    } else if (questionnaireStatus === 'INCOMPLETE') {
      resultList = resultList.filter((s) => s.completedQuestionnairesCount < totalQuestionnairesCount);
    }

    return NextResponse.json({
      success: true,
      students: resultList,
      totalCount: resultList.length,
      totalQuestionnairesCount,
    });
  } catch (err: any) {
    console.error('Error fetching student details for admin:', err);
    return NextResponse.json({ error: 'Failed to load student details' }, { status: 500 });
  }
}
