import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApiRequest(req, 'TEACHER');
  if (errorResponse || !user) return errorResponse;

  try {
    // Fetch all active students with responses
    const responses = await prisma.questionnaireResponse.findMany({
      include: {
        questionnaire: {
          select: { code: true, title: true },
        },
        student: {
          select: {
            id: true,
            fullName: true,
            sprStudentId: true,
            class: { select: { name: true } },
          },
        },
      },
    });

    const groupsMap = new Map<string, {
      id: string;
      name: string;
      category: string;
      description: string;
      studentCount: number;
      students: { id: string; name: string; sprStudentId: string; className: string }[];
    }>();

    const addStudentToGroup = (groupId: string, name: string, category: string, desc: string, student: any) => {
      let group = groupsMap.get(groupId);
      if (!group) {
        group = {
          id: groupId,
          name,
          category,
          description: desc,
          studentCount: 0,
          students: [],
        };
        groupsMap.set(groupId, group);
      }
      if (!group.students.some((s) => s.id === student.id)) {
        group.students.push({
          id: student.id,
          name: student.fullName,
          sprStudentId: student.sprStudentId,
          className: student.class?.name || '',
        });
        group.studentCount = group.students.length;
      }
    };

    for (const r of responses) {
      if (!r.student) continue;
      let answers: Record<string, any> = {};
      try {
        answers = typeof r.answers === 'string' ? JSON.parse(r.answers) : (r.answers || {});
      } catch {
        continue;
      }

      const qCode = r.questionnaire.code;

      // 1. Entrance Exams
      if (qCode === 'ENTRANCE_EXAMS') {
        const exams = answers.q2_target_exams;
        if (Array.isArray(exams)) {
          for (const ex of exams) {
            addStudentToGroup(
              `group_exam_${ex.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
              `${ex} Aspirants`,
              'Entrance Examinations',
              `Students preparing or interested in ${ex}`,
              r.student
            );
          }
        }
      }

      // 2. Language & Communication
      if (qCode === 'LANGUAGE_COMMUNICATION') {
        const toLearn = answers.q4_languages_to_learn;
        if (Array.isArray(toLearn)) {
          for (const lang of toLearn) {
            addStudentToGroup(
              `group_lang_${lang.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
              `Interested in Learning ${lang}`,
              'Language & Communication',
              `Students who desire to learn ${lang}`,
              r.student
            );
          }
        }
      }

      // 3. Skills & Talents
      if (qCode === 'SKILLS_TALENTS') {
        const skills = answers.q1_skills_list;
        if (Array.isArray(skills)) {
          for (const sk of skills) {
            addStudentToGroup(
              `group_skill_${sk.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
              `Talented in ${sk}`,
              'Skills & Talents',
              `Students possessing skills in ${sk}`,
              r.student
            );
          }
        }
      }

      // 4. Extracurricular & Sports
      if (qCode === 'EXTRACURRICULAR') {
        const sports = answers.q3_sports_games;
        if (Array.isArray(sports)) {
          for (const sp of sports) {
            addStudentToGroup(
              `group_sport_${sp.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
              `${sp} Players & Athletes`,
              'Sports & Extracurricular',
              `Active participants in ${sp}`,
              r.student
            );
          }
        }
      }

      // 5. Ambitions & Career Fields
      if (qCode === 'AMBITIONS_GOALS') {
        const careers = answers.q1_career_fields;
        if (Array.isArray(careers)) {
          for (const cr of careers) {
            addStudentToGroup(
              `group_career_${cr.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
              `${cr} Career Focus`,
              'Career Ambitions',
              `Students aspiring towards careers in ${cr}`,
              r.student
            );
          }
        }
      }

      // 6. Islamic Studies Focus
      if (qCode === 'ISLAMIC_PROFILE') {
        const fav = answers.q2_favourite_subject;
        if (fav && typeof fav === 'string') {
          addStudentToGroup(
            `group_islamic_fav_${fav.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            `Islamic Focus: ${fav}`,
            'Islamic Studies',
            `Students whose favourite Islamic subject is ${fav}`,
            r.student
          );
        }
      }
    }

    const groupsList = Array.from(groupsMap.values()).sort((a, b) => b.studentCount - a.studentCount);

    return NextResponse.json({
      success: true,
      groups: groupsList,
    });
  } catch (err: any) {
    console.error('Error deriving dynamic student groups:', err);
    return NextResponse.json({ error: 'Failed to derive groups' }, { status: 500 });
  }
}
