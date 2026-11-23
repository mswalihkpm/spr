import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import {
  masterStudentDetailsCache,
  inFlightMasterStudentDetailsPromise,
  ADMIN_DETAILS_CACHE_TTL_MS,
  setMasterStudentDetailsCache,
  setInFlightMasterStudentDetailsPromise,
} from '@/lib/server-cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApiRequest(req, 'TEACHER');
  if (errorResponse || !user) return errorResponse;

  const url = new URL(req.url);
  const classId = url.searchParams.get('classId') || '';
  const search = url.searchParams.get('q') || '';
  const isProfileLockedParam = url.searchParams.get('locked');
  const questionnaireStatus = url.searchParams.get('qStatus'); // e.g. ALL_COMPLETED, INCOMPLETE
  const forceFresh = url.searchParams.get('fresh') === '1' || url.searchParams.get('nocache') === '1';

  try {
    const now = Date.now();
    let masterData =
      !forceFresh && masterStudentDetailsCache && now - masterStudentDetailsCache.timestamp < ADMIN_DETAILS_CACHE_TTL_MS
        ? masterStudentDetailsCache
        : null;

    if (!masterData) {
      if (!forceFresh && inFlightMasterStudentDetailsPromise) {
        masterData = await inFlightMasterStudentDetailsPromise;
      } else {
        const fetchPromise = (async () => {
          const [students, totalQuestionnairesCount] = await Promise.all([
            prisma.student.findMany({
              where: { status: 'ACTIVE' },
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
            }),
            prisma.questionnaire.count({ where: { isActive: true } }),
          ]);

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

          const resData = {
            timestamp: Date.now(),
            students: formattedStudents,
            totalQuestionnairesCount,
          };
          setMasterStudentDetailsCache(resData);
          return resData;
        })();

        setInFlightMasterStudentDetailsPromise(fetchPromise);
        try {
          masterData = await fetchPromise;
        } finally {
          setInFlightMasterStudentDetailsPromise(null);
        }
      }
    }

    let resultList = masterData.students;

    if (classId) {
      resultList = resultList.filter((s) => s.classId === classId);
    }

    if (isProfileLockedParam === 'true') {
      resultList = resultList.filter((s) => s.isProfileLocked === true);
    } else if (isProfileLockedParam === 'false') {
      resultList = resultList.filter((s) => s.isProfileLocked === false);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      resultList = resultList.filter(
        (s) =>
          s.fullName?.toLowerCase().includes(q) ||
          s.sprStudentId?.toLowerCase().includes(q) ||
          s.studentId?.toLowerCase().includes(q) ||
          s.guardianPhone?.toLowerCase().includes(q) ||
          s.studentPhone?.toLowerCase().includes(q) ||
          s.studentEmail?.toLowerCase().includes(q) ||
          s.place?.toLowerCase().includes(q)
      );
    }

    if (questionnaireStatus === 'COMPLETED') {
      resultList = resultList.filter((s) => s.completedQuestionnairesCount === masterData!.totalQuestionnairesCount);
    } else if (questionnaireStatus === 'INCOMPLETE') {
      resultList = resultList.filter((s) => s.completedQuestionnairesCount < masterData!.totalQuestionnairesCount);
    }

    return NextResponse.json(
      {
        success: true,
        students: resultList,
        totalCount: resultList.length,
        totalQuestionnairesCount: masterData.totalQuestionnairesCount,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
        },
      }
    );
  } catch (err: any) {
    console.error('Error fetching student details for admin:', err);
    return NextResponse.json({ error: 'Failed to load student details' }, { status: 500 });
  }
}
