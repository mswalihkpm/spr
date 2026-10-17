export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveLevelMultiplier, resolvePrizeMultiplier } from '@/lib/spr-engine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('id') || '';
    const itemName = searchParams.get('name')?.trim() || '';
    const itemType = searchParams.get('type') || ''; // 'LITERARY_COMPETITION' | 'COMPETITION' | 'EXAM' | 'SUBJECT' | 'GENERIC'
    const classId = searchParams.get('classId') || '';

    if (!itemId && !itemName) {
      return NextResponse.json({ error: 'Item ID or Item Name is required.' }, { status: 400 });
    }

    const levels = await prisma.level.findMany({ where: { active: true } });

    // Build conditions to find all performance records associated with this programme / competition / exam
    const orConditions: any[] = [];

    if (itemId) {
      if (itemType === 'LITERARY_COMPETITION') {
        orConditions.push({ literaryCompetitionId: itemId });
      } else if (itemType === 'COMPETITION') {
        orConditions.push({ competitionId: itemId });
      } else if (itemType === 'EXAM') {
        orConditions.push({ examId: itemId });
      } else if (itemType === 'SUBJECT') {
        orConditions.push({ subjectId: itemId });
      } else {
        orConditions.push(
          { literaryCompetitionId: itemId },
          { competitionId: itemId },
          { examId: itemId },
          { subjectId: itemId }
        );
      }
    }

    if (itemName) {
      orConditions.push(
        { literaryCompetition: { name: { equals: itemName } } },
        { literaryCompetition: { name: { contains: itemName } } },
        { competition: { name: { equals: itemName } } },
        { competition: { name: { contains: itemName } } },
        { exam: { name: { equals: itemName } } },
        { exam: { name: { contains: itemName } } },
        { subject: { name: { equals: itemName } } },
        { remarks: { contains: itemName } }
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
        level: true,
        category: true,
        subcategory: true,
        literaryCompetition: {
          include: { event: true, level: true },
        },
        competition: {
          include: { program: true },
        },
        exam: true,
        subject: true,
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
    processedEntries.sort((a, b) => {
      const pA = getPosPriority(a.position);
      const pB = getPosPriority(b.position);
      if (pA !== pB) return pA - pB;
      if (b.sprPoints !== a.sprPoints) return b.sprPoints - a.sprPoints;
      return a.fullName.localeCompare(b.fullName);
    });

    // Assign joint rankings
    let currentRank = 1;
    const rankedLeaderboard = processedEntries.map((entry, idx) => {
      if (idx > 0) {
        const prev = processedEntries[idx - 1];
        const isSameScore = prev.sprPoints === entry.sprPoints && prev.position === entry.position;
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

    return NextResponse.json({
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
    });
  } catch (error: any) {
    console.error('Item leaderboard fetch error:', error);
    return NextResponse.json({ error: 'Failed to calculate item leaderboard.' }, { status: 500 });
  }
}
