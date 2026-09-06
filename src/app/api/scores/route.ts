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

    const savedRecords = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const entry of entries) {
        const obtained = Number(entry.obtainedScore);
        const max = Number(entry.maxScore) || 100;
        const percentage = normalizeScoreToPercentage(obtained, max);

        // Check if an identical record exists to update it rather than creating duplicates
        const existing = await tx.performanceRecord.findFirst({
          where: {
            studentId: entry.studentId,
            categoryId,
            ...(examId ? { examId } : {}),
            ...(subjectId ? { subjectId } : {}),
            ...(competitionId ? { competitionId } : {}),
            ...(literaryCompetitionId ? { literaryCompetitionId } : {}),
            ...(defaultTermId ? { termId: defaultTermId } : {}),
          },
        });

        if (existing) {
          const updated = await tx.performanceRecord.update({
            where: { id: existing.id },
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
          results.push(updated);
        } else {
          const created = await tx.performanceRecord.create({
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
          results.push(created);
        }
      }
      return results;
    });

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

