export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveLevelMultiplier, resolvePrizeMultiplier } from '@/lib/spr-engine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('id') || '';
    const itemIds = searchParams.get('ids') || '';
    const itemName = searchParams.get('name')?.trim() || '';
    const itemType = searchParams.get('type') || ''; // 'LITERARY_COMPETITION' | 'COMPETITION' | 'EXAM' | 'SUBJECT' | 'GENERIC'
    const classId = searchParams.get('classId') || '';

    const idsList = Array.from(
      new Set(
        [
          itemId,
          ...(itemIds ? itemIds.split(',').map((s) => s.trim()) : []),
        ].filter(Boolean)
      )
    );

    if (idsList.length === 0 && !itemName) {
      return NextResponse.json({ error: 'Item ID or Item Name is required.' }, { status: 400 });
    }

    const levels = await prisma.level.findMany({ where: { active: true } });

    // Resolve common name if not explicitly provided
    let resolvedTargetName = itemName;
    if (!resolvedTargetName && idsList.length > 0) {
      const firstId = idsList[0];
      const [lc, comp, ex, sub] = await Promise.all([
        prisma.literaryCompetition.findUnique({ where: { id: firstId }, select: { name: true } }),
        prisma.competition.findUnique({ where: { id: firstId }, select: { name: true } }),
        prisma.exam.findUnique({ where: { id: firstId }, select: { name: true } }),
        prisma.subject.findUnique({ where: { id: firstId }, select: { name: true } }),
      ]);
      resolvedTargetName = lc?.name || comp?.name || ex?.name || sub?.name || '';
    }

    // Build conditions to find all performance records associated with this programme / competition / exam
    const orConditions: any[] = [];

    if (idsList.length > 0) {
      if (itemType === 'LITERARY_COMPETITION') {
        orConditions.push({ literaryCompetitionId: { in: idsList } });
      } else if (itemType === 'COMPETITION') {
        orConditions.push({ competitionId: { in: idsList } });
      } else if (itemType === 'EXAM') {
        orConditions.push({ examId: { in: idsList } });
      } else if (itemType === 'SUBJECT') {
        orConditions.push({ subjectId: { in: idsList } });
      } else {
        orConditions.push(
          { literaryCompetitionId: { in: idsList } },
          { competitionId: { in: idsList } },
          { examId: { in: idsList } },
          { subjectId: { in: idsList } }
        );
      }
    }

    if (resolvedTargetName) {
      orConditions.push(
        { literaryCompetition: { name: { equals: resolvedTargetName, mode: 'insensitive' } } },
        { competition: { name: { equals: resolvedTargetName, mode: 'insensitive' } } },
        { exam: { name: { equals: resolvedTargetName, mode: 'insensitive' } } },
        { subject: { name: { equals: resolvedTargetName, mode: 'insensitive' } } }
      );
    }

    // Query performance records with all relationships
    const records = await prisma.performanceRecord.findMany({
      where: {
        OR: orConditions,
        student: {
          status: { not: 'INACTIVE' },
          ...(classId ? { classId } : {}),
        },
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            sprStudentId: true,
            fullName: true,
            division: true,
            photoUrl: true,
            classId: true,
            class: { select: { id: true, name: true, numericGrade: true } },
            school: { select: { id: true, name: true } },
          },
        },
        level: { select: { id: true, name: true, weightMultiplier: true } },
        category: { select: { id: true, name: true, code: true } },
        subcategory: { select: { id: true, name: true, code: true, weight: true } },
        literaryCompetition: {
          select: {
            id: true,
            name: true,
            event: { select: { id: true, name: true } },
            level: { select: { id: true, name: true, weightMultiplier: true } },
          },
        },
        competition: {
          select: {
            id: true,
            name: true,
            program: { select: { id: true, name: true } },
          },
        },
        exam: { select: { id: true, name: true, maxScore: true } },
        subject: { select: { id: true, name: true, maxScore: true } },
      },
      orderBy: [{ obtainedScore: 'desc' }, { createdAt: 'asc' }],
    });

    if (records.length === 0) {
      return NextResponse.json({
        item: {
          name: itemName || 'Competition / Exam',
          type: itemType || 'COMPETITION',
          parentName: '',
          categoryName: 'Performance Scoring',
          totalParticipants: 0,
        },
        leaderboard: [],
        totalStudents: 0,
      });
    }

    // Extract item meta details from first record
    const firstRec = records[0];
    let resolvedItemName = itemName;
    let parentName = '';
    let categoryName = firstRec.category?.name || 'Evaluation Category';
    let categoryCode = firstRec.category?.code || 'PROGRAMS';

    if (firstRec.literaryCompetition) {
      resolvedItemName = firstRec.literaryCompetition.name;
      parentName = firstRec.literaryCompetition.event?.name || 'Literary Festival';
      categoryName = 'Literary Festivals';
      categoryCode = 'LITERARY';
    } else if (firstRec.competition) {
      resolvedItemName = firstRec.competition.name;
      parentName = firstRec.competition.program?.name || 'Program';
      categoryName = 'Programs & Competitions';
      categoryCode = 'PROGRAMS';
    } else if (firstRec.exam) {
      resolvedItemName = firstRec.exam.name;
      parentName = firstRec.category?.name || 'Academic Assessment';
      categoryName = firstRec.category?.name || 'School Studies';
      categoryCode = firstRec.category?.code || 'SCHOOL';
    } else if (firstRec.subject) {
      resolvedItemName = firstRec.subject.name;
      parentName = (firstRec as any).exam?.name || 'Subject Assessment';
    }

    // Calculate points and build leaderboard entries
    const processedEntries = records.map((r) => {
      const isLitOrProg = categoryCode === 'LITERARY' || categoryCode === 'PROGRAMS' || Boolean(r.literaryCompetition || r.competition);
      const lvlMult = resolveLevelMultiplier(r.level || r.literaryCompetition?.level, levels);
      const prizeMult = resolvePrizeMultiplier(r.position);
      const baseScore = typeof r.obtainedScore === 'number' && !isNaN(r.obtainedScore) ? r.obtainedScore : 0;

      let sprPoints = 0;
      if (isLitOrProg) {
        // Points given after multiplying with respect to level, positions
        sprPoints = Number((baseScore * lvlMult * prizeMult).toFixed(2));
      } else {
        // Academic Exam: scaled percentage / marks
        const maxScoreVal = r.maxScore || r.subject?.maxScore || 100;
        const examActualMax = r.exam?.maxScore || 100;
        sprPoints = maxScoreVal > 0 ? Number(((baseScore / maxScoreVal) * examActualMax).toFixed(2)) : baseScore;
      }

      return {
        recordId: r.id,
        studentId: r.student.id,
        sprStudentId: r.student.sprStudentId || r.student.studentId,
        fullName: r.student.fullName,
        photoUrl: r.student.photoUrl,
        className: r.student.class?.name || '',
        numericGrade: r.student.class?.numericGrade ?? 99,
        division: r.student.division,
        schoolName: r.student.school?.name || '',
        position: r.position,
        grade: r.grade,
        baseScore,
        maxScore: r.maxScore || 100,
        levelName: r.level?.name || r.literaryCompetition?.level?.name || 'Campus',
        levelMultiplier: lvlMult,
        prizeMultiplier: prizeMult,
        sprPoints,
        remarks: r.remarks,
        date: r.date ? r.date.toISOString() : null,
      };
    });

    // Deduplicate entries by studentId if a student has multiple records across merged same-name competitions
    const studentBestMap = new Map<string, (typeof processedEntries)[0]>();
    for (const entry of processedEntries) {
      const existing = studentBestMap.get(entry.studentId);
      if (!existing || entry.sprPoints > existing.sprPoints) {
        studentBestMap.set(entry.studentId, entry);
      }
    }
    const uniqueEntries = Array.from(studentBestMap.values());

    // Helper: Position rank priority (1st > 2nd > 3rd)
    const getPosPriority = (pos: string | null | undefined): number => {
      if (!pos) return 99;
      const lower = pos.toLowerCase();
      if (lower.includes('1') || lower.includes('first')) return 1;
      if (lower.includes('2') || lower.includes('second')) return 2;
      if (lower.includes('3') || lower.includes('third')) return 3;
      return 10;
    };

    // Sort by position priority first, then sprPoints descending, then student name
    uniqueEntries.sort((a, b) => {
      const pA = getPosPriority(a.position);
      const pB = getPosPriority(b.position);
      if (pA !== pB) return pA - pB;
      if (b.sprPoints !== a.sprPoints) return b.sprPoints - a.sprPoints;
      return a.fullName.localeCompare(b.fullName);
    });

    // Assign joint rankings
    let currentRank = 1;
    const rankedLeaderboard = uniqueEntries.map((entry, idx) => {
      if (idx > 0) {
        const prev = uniqueEntries[idx - 1];
        const isSameScore =
          prev.sprPoints === entry.sprPoints &&
          getPosPriority(prev.position) === getPosPriority(entry.position);
        if (!isSameScore) {
          currentRank = idx + 1;
        }
      }
      return {
        ...entry,
        rank: currentRank,
      };
    });

    // Aggregate statistics
    const topScore = rankedLeaderboard.length > 0 ? rankedLeaderboard[0].sprPoints : 0;
    const avgScore =
      rankedLeaderboard.length > 0
        ? Number(
            (
              rankedLeaderboard.reduce((acc, curr) => acc + curr.sprPoints, 0) /
              rankedLeaderboard.length
            ).toFixed(2)
          )
        : 0;

    return NextResponse.json(
      {
        item: {
          id: itemId || firstRec.literaryCompetitionId || firstRec.competitionId || firstRec.examId,
          name: resolvedItemName,
          parentName,
          categoryName,
          categoryCode,
          totalParticipants: rankedLeaderboard.length,
          topScore,
          avgScore,
        },
        leaderboard: rankedLeaderboard,
        totalStudents: rankedLeaderboard.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      }
    );
  } catch (error: any) {
    console.error('Item leaderboard fetch error:', error);
    return NextResponse.json({ error: 'Failed to calculate item leaderboard.' }, { status: 500 });
  }
}
