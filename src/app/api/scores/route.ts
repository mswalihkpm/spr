export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { normalizeScoreToPercentage } from '@/lib/spr-engine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const examId = searchParams.get('examId');
    const subjectId = searchParams.get('subjectId');
    const competitionId = searchParams.get('competitionId');
    const literaryCompetitionId = searchParams.get('literaryCompetitionId');
    const classId = searchParams.get('classId');
    const termId = searchParams.get('termId');
    const academicYearId = searchParams.get('academicYearId');
    const studentId = searchParams.get('studentId');
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (examId) where.examId = examId;
    if (subjectId) where.subjectId = subjectId;
    if (competitionId) where.competitionId = competitionId;
    if (literaryCompetitionId) where.literaryCompetitionId = literaryCompetitionId;
    if (termId) where.termId = termId;
    if (academicYearId) where.academicYearId = academicYearId;
    if (studentId) where.studentId = studentId;
    if (classId) {
      where.student = { classId };
    }

    const records = await prisma.performanceRecord.findMany({
      where,
      include: {
        student: {
          include: {
            class: true,
            school: true,
          },
        },
        category: true,
        subject: true,
        exam: true,
        competition: {
          include: { program: true },
        },
        literaryCompetition: {
          include: { event: true },
        },
        level: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ records });
  } catch (error: any) {
    console.error('Fetch scores error:', error);
    return NextResponse.json({ error: 'Failed to fetch score records.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const {
      categoryId,
      subcategoryId,
      examId,
      subjectId,
      competitionId,
      literaryCompetitionId,
      levelId,
      termId,
      academicYearId,
      date,
      entries, // Array of { studentId, obtainedScore, maxScore, remarks }
    } = body;

    if (!categoryId || !entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'Category ID and at least one score entry are required.' }, { status: 400 });
    }

    let defaultYearId = academicYearId;
    if (!defaultYearId) {
      const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } }) ||
        await prisma.academicYear.findFirst();
      defaultYearId = currentYear?.id;
    }

    let defaultTermId = termId;
    if (!defaultTermId) {
      const currentTerm = await prisma.term.findFirst({ where: { isCurrent: true } }) ||
        await prisma.term.findFirst();
      defaultTermId = currentTerm?.id;
    }

    // Pre-fetch all existing performance records for these students in this category in ONE query
    const studentIds = Array.from(new Set(entries.map((e: any) => e.studentId).filter(Boolean)));
    const existingRecords = studentIds.length > 0
      ? await prisma.performanceRecord.findMany({
          where: {
            studentId: { in: studentIds as string[] },
            categoryId,
            ...(defaultTermId ? { termId: defaultTermId } : {}),
          },
        })
      : [];

    type ScoreWriteAction =
      | { type: 'UPDATE'; id: string; data: any }
      | { type: 'CREATE'; data: any };

    const writeActions: ScoreWriteAction[] = [];

    for (const entry of entries) {
      const obtained = Number(entry.obtainedScore);
      const max = Number(entry.maxScore) || 100;
      const percentage = normalizeScoreToPercentage(obtained, max);

      const existing = existingRecords.find((r) =>
        r.studentId === entry.studentId &&
        r.categoryId === categoryId &&
        (!examId || r.examId === examId) &&
        (!subjectId || r.subjectId === subjectId) &&
        (!competitionId || r.competitionId === competitionId) &&
        (!literaryCompetitionId || r.literaryCompetitionId === literaryCompetitionId) &&
        (!defaultTermId || r.termId === defaultTermId)
      );

      if (existing) {
        writeActions.push({
          type: 'UPDATE',
          id: existing.id,
          data: {
            obtainedScore: obtained,
            maxScore: max,
            percentage,
            levelId: levelId || existing.levelId,
            date: date ? new Date(date) : existing.date,
            remarks: entry.remarks !== undefined ? entry.remarks : existing.remarks,
            updatedById: user?.id,
          },
        });
      } else {
        writeActions.push({
          type: 'CREATE',
          data: {
            studentId: entry.studentId,
            categoryId,
            subcategoryId: subcategoryId || null,
            examId: examId || null,
            subjectId: subjectId || null,
            competitionId: competitionId || null,
            literaryCompetitionId: literaryCompetitionId || null,
            levelId: levelId || null,
            termId: defaultTermId || null,
            academicYearId: defaultYearId || null,
            obtainedScore: obtained,
            maxScore: max,
            percentage,
            date: date ? new Date(date) : new Date(),
            remarks: entry.remarks || null,
            createdById: user?.id,
          },
        });
        // Register in existingRecords stub to prevent duplicates if student is repeated in entries
        existingRecords.push({
          id: `temp_${Date.now()}_${Math.random()}`,
          studentId: entry.studentId,
          categoryId,
          subcategoryId: subcategoryId || null,
          examId: examId || null,
          subjectId: subjectId || null,
          competitionId: competitionId || null,
          literaryCompetitionId: literaryCompetitionId || null,
          levelId: levelId || null,
          termId: defaultTermId || null,
          academicYearId: defaultYearId || null,
          obtainedScore: obtained,
          maxScore: max,
          percentage,
          date: date ? new Date(date) : new Date(),
          remarks: entry.remarks || null,
          createdById: user?.id,
          updatedById: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          eventId: null,
        } as any);
      }
    }

    const savedRecords: any[] = [];
    const BATCH_SIZE = 25;
    for (let i = 0; i < writeActions.length; i += BATCH_SIZE) {
      const batch = writeActions.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (action) => {
          if (action.type === 'UPDATE') {
            return await prisma.performanceRecord.update({
              where: { id: action.id },
              data: action.data,
            });
          } else {
            return await prisma.performanceRecord.create({
              data: action.data,
            });
          }
        })
      );
      savedRecords.push(...batchResults);
    }

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'SAVE_SCORES',
      entity: 'PerformanceRecord',
      newValue: { count: savedRecords.length, categoryId, examId, subjectId },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${savedRecords.length} score records.`,
      recordsCount: savedRecords.length,
    });
  } catch (error: any) {
    console.error('Save scores error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save scores.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { id, obtainedScore, maxScore, remarks, levelId, date } = body;

    if (!id) {
      return NextResponse.json({ error: 'Score record ID is required.' }, { status: 400 });
    }

    const existing = await prisma.performanceRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Score record not found.' }, { status: 404 });
    }

    const obtained = obtainedScore !== undefined ? Number(obtainedScore) : existing.obtainedScore;
    const max = maxScore !== undefined ? Number(maxScore) : existing.maxScore;
    const percentage = normalizeScoreToPercentage(obtained, max);

    const updated = await prisma.performanceRecord.update({
      where: { id },
      data: {
        obtainedScore: obtained,
        maxScore: max,
        percentage,
        ...(remarks !== undefined ? { remarks } : {}),
        ...(levelId !== undefined ? { levelId } : {}),
        ...(date ? { date: new Date(date) } : {}),
        updatedById: user?.id,
      },
      include: {
        student: true,
        category: true,
      },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'UPDATE_SCORE',
      entity: 'PerformanceRecord',
      entityId: id,
      previousValue: existing,
      newValue: updated,
    });

    return NextResponse.json({
      success: true,
      record: updated,
      message: 'Score record updated successfully.',
    });
  } catch (error: any) {
    console.error('Update score error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update score.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    // Check if JSON body with array of IDs was provided
    let idsToDelete: string[] = [];
    try {
      const body = await req.json();
      if (body && Array.isArray(body.ids)) {
        idsToDelete = body.ids;
      }
    } catch {
      // Body not JSON or empty
    }

    if (id) {
      idsToDelete.push(id);
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'Score record ID(s) are required for deletion.' }, { status: 400 });
    }

    const deleteResult = await prisma.performanceRecord.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'DELETE_SCORE',
      entity: 'PerformanceRecord',
      newValue: { count: deleteResult.count, ids: idsToDelete },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.count} score record(s).`,
      count: deleteResult.count,
    });
  } catch (error: any) {
    console.error('Delete score error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete score.' }, { status: 500 });
  }
}

