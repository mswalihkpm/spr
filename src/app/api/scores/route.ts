export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { normalizeScoreToPercentage, invalidateEngineCache } from '@/lib/spr-engine';

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
    const limit = parseInt(searchParams.get('limit') || '500', 10);

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
      examName,
      subjectId,
      subjectName,
      competitionId,
      literaryCompetitionId,
      levelId,
      termId,
      academicYearId,
      date,
      entries, // Array of { studentId, obtainedScore, maxScore, remarks, position, grade }
    } = body;

    let targetCategoryId = categoryId;
    if (!targetCategoryId && subcategoryId) {
      const sub = await prisma.subcategory.findUnique({ where: { id: subcategoryId } });
      if (sub) targetCategoryId = sub.categoryId;
    }
    if (!targetCategoryId && competitionId) {
      const progCat = await prisma.category.findUnique({ where: { code: 'PROGRAMS' } });
      if (progCat) targetCategoryId = progCat.id;
    }
    if (!targetCategoryId && literaryCompetitionId) {
      const litCat = await prisma.category.findUnique({ where: { code: 'LITERARY' } });
      if (litCat) targetCategoryId = litCat.id;
    }
    if (!targetCategoryId && examId) {
      const ex = await prisma.exam.findUnique({ where: { id: examId } });
      if (ex) targetCategoryId = ex.categoryId;
    }
    if (!targetCategoryId) {
      const qualCat = await prisma.category.findUnique({ where: { code: 'QUALIFICATION' } });
      const firstCat = await prisma.category.findFirst();
      targetCategoryId = qualCat?.id || firstCat?.id;
    }

    let defaultYearId = academicYearId;
    if (!defaultYearId) {
      let currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
      if (!currentYear) currentYear = await prisma.academicYear.findFirst();
      if (!currentYear) {
        currentYear = await prisma.academicYear.create({
          data: { name: '2025-2026', isCurrent: true, startDate: new Date('2025-06-01'), endDate: new Date('2026-03-31') },
        });
      }
      defaultYearId = currentYear.id;
    }

    let defaultTermId = termId;
    if (!defaultTermId) {
      let currentTerm = await prisma.term.findFirst({ where: { isCurrent: true } });
      if (!currentTerm) currentTerm = await prisma.term.findFirst();
      if (!currentTerm) {
        currentTerm = await prisma.term.create({
          data: { name: 'Term 1', code: 'T1', academicYearId: defaultYearId, isCurrent: true },
        });
      }
      defaultTermId = currentTerm.id;
    }

    // Resolve or auto-create Exam if examName is provided
    let resolvedExamId = examId || null;
    if (!resolvedExamId && examName && targetCategoryId) {
      let ex = await prisma.exam.findFirst({ where: { categoryId: targetCategoryId, name: examName.trim() } });
      if (!ex) {
        ex = await prisma.exam.create({
          data: { name: examName.trim(), categoryId: targetCategoryId, termId: defaultTermId, academicYearId: defaultYearId },
        });
      }
      resolvedExamId = ex.id;
    }

    // Resolve or auto-create Subject if subjectName is provided
    let resolvedSubjectId = subjectId || null;
    if (!resolvedSubjectId && subjectName && targetCategoryId) {
      let sub = await prisma.subject.findFirst({ where: { categoryId: targetCategoryId, name: subjectName.trim() } });
      if (!sub) {
        const code = `SUB_${subjectName.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 10)}_${Date.now().toString(36).slice(-3)}`;
        sub = await prisma.subject.create({
          data: { name: subjectName.trim(), code, categoryId: targetCategoryId, maxScore: 100 },
        });
      }
      resolvedSubjectId = sub.id;
    }

    let scoreEntries = entries;
    if ((!scoreEntries || !Array.isArray(scoreEntries) || scoreEntries.length === 0) && (body.studentId || body.score !== undefined || body.obtainedScore !== undefined)) {
      if (body.studentId) {
        scoreEntries = [
          {
            studentId: body.studentId,
            obtainedScore: body.obtainedScore !== undefined ? body.obtainedScore : body.score,
            maxScore: body.maxScore || 100,
            position: body.position || null,
            grade: body.grade || null,
            remarks: body.remarks || '',
          },
        ];
      }
    }

    const validEntries = (scoreEntries || []).filter((e: any) => e && e.studentId && typeof e.studentId === 'string' && e.studentId.trim() !== '');

    if (!validEntries.length) {
      return NextResponse.json({ error: 'Please select a student and provide a valid score entry.' }, { status: 400 });
    }

    if (!targetCategoryId) {
      return NextResponse.json({ error: 'Category ID could not be identified.' }, { status: 400 });
    }

    // Pre-fetch existing records
    const studentIds = Array.from(new Set(validEntries.map((e: any) => e.studentId).filter(Boolean)));
    const existingRecords = studentIds.length > 0
      ? await prisma.performanceRecord.findMany({
          where: {
            studentId: { in: studentIds as string[] },
            categoryId: targetCategoryId,
            ...(defaultTermId ? { termId: defaultTermId } : {}),
          },
        })
      : [];

    type ScoreWriteAction =
      | { type: 'UPDATE'; id: string; data: any }
      | { type: 'CREATE'; data: any };

    const writeActions: ScoreWriteAction[] = [];

    for (const entry of validEntries) {
      const obtained = Number(entry.obtainedScore !== undefined ? entry.obtainedScore : entry.score) || 0;
      const max = Number(entry.maxScore) || 100;
      const percentage = normalizeScoreToPercentage(obtained, max);

      const existing = existingRecords.find((r) =>
        r.studentId === entry.studentId &&
        r.categoryId === targetCategoryId &&
        (!subcategoryId || r.subcategoryId === subcategoryId) &&
        (!resolvedExamId || r.examId === resolvedExamId) &&
        (!resolvedSubjectId || r.subjectId === resolvedSubjectId) &&
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
            subcategoryId: subcategoryId || existing.subcategoryId,
            position: entry.position !== undefined ? entry.position : existing.position,
            grade: entry.grade !== undefined ? entry.grade : existing.grade,
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
            categoryId: targetCategoryId,
            subcategoryId: subcategoryId || null,
            examId: resolvedExamId,
            subjectId: resolvedSubjectId,
            competitionId: competitionId || null,
            literaryCompetitionId: literaryCompetitionId || null,
            levelId: levelId || null,
            position: entry.position || null,
            grade: entry.grade || null,
            termId: defaultTermId,
            academicYearId: defaultYearId,
            obtainedScore: obtained,
            maxScore: max,
            percentage,
            date: date ? new Date(date) : new Date(),
            remarks: entry.remarks || null,
            createdById: user?.id,
          },
        });
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
      newValue: { count: savedRecords.length, categoryId: targetCategoryId, examId: resolvedExamId, subjectId: resolvedSubjectId },
    });

    invalidateEngineCache();

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
    const { id, obtainedScore, score, maxScore, remarks, levelId, position, grade, date, subjectId, examId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Score record ID is required.' }, { status: 400 });
    }

    const existing = await prisma.performanceRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Score record not found.' }, { status: 404 });
    }

    const rawObtained = obtainedScore !== undefined ? obtainedScore : score;
    const obtained = rawObtained !== undefined ? Number(rawObtained) : existing.obtainedScore;
    const max = maxScore !== undefined ? Number(maxScore) : existing.maxScore;
    const percentage = normalizeScoreToPercentage(obtained, max);

    const updated = await prisma.performanceRecord.update({
      where: { id },
      data: {
        obtainedScore: obtained,
        maxScore: max,
        percentage,
        ...(remarks !== undefined ? { remarks } : {}),
        ...(position !== undefined ? { position } : {}),
        ...(grade !== undefined ? { grade } : {}),
        ...(levelId !== undefined ? { levelId } : {}),
        ...(subjectId !== undefined ? { subjectId } : {}),
        ...(examId !== undefined ? { examId } : {}),
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

    invalidateEngineCache();

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
    const idsParam = searchParams.get('ids');
    let deleteCategoryId = searchParams.get('categoryId');
    let deleteExamId = searchParams.get('examId');
    let deleteStudentId = searchParams.get('studentId');
    let deleteSubjectId = searchParams.get('subjectId');
    let deleteClassId = searchParams.get('classId');
    let deleteAll = searchParams.get('all') === 'true';

    const idsSet = new Set<string>();
    if (id) idsSet.add(id.trim());
    if (idsParam) idsParam.split(',').forEach((s) => s.trim() && idsSet.add(s.trim()));

    try {
      const body = await req.json();
      if (body) {
        if (body.id) idsSet.add(String(body.id).trim());
        if (Array.isArray(body.ids)) {
          body.ids.forEach((s: any) => s && idsSet.add(String(s).trim()));
        } else if (typeof body.ids === 'string') {
          body.ids.split(',').forEach((s: string) => s.trim() && idsSet.add(s.trim()));
        }
        if (Array.isArray(body.scoreIds)) {
          body.scoreIds.forEach((s: any) => s && idsSet.add(String(s).trim()));
        }
        if (body.categoryId) deleteCategoryId = body.categoryId;
        if (body.examId) deleteExamId = body.examId;
        if (body.subjectId) deleteSubjectId = body.subjectId;
        if (body.studentId) deleteStudentId = body.studentId;
        if (body.classId) deleteClassId = body.classId;
        if (body.all) deleteAll = true;
      }
    } catch {
      // Body not JSON or empty
    }

    const idsToDelete = Array.from(idsSet);

    let deleteResult = { count: 0 };

    if (idsToDelete.length > 0) {
      deleteResult = await prisma.performanceRecord.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    } else if (deleteAll && deleteCategoryId) {
      deleteResult = await prisma.performanceRecord.deleteMany({
        where: { categoryId: deleteCategoryId },
      });
    } else if (deleteExamId) {
      deleteResult = await prisma.performanceRecord.deleteMany({
        where: { examId: deleteExamId, ...(deleteCategoryId ? { categoryId: deleteCategoryId } : {}) },
      });
    } else if (deleteSubjectId) {
      deleteResult = await prisma.performanceRecord.deleteMany({
        where: { subjectId: deleteSubjectId, ...(deleteCategoryId ? { categoryId: deleteCategoryId } : {}) },
      });
    } else if (deleteClassId) {
      deleteResult = await prisma.performanceRecord.deleteMany({
        where: {
          student: { classId: deleteClassId },
          ...(deleteCategoryId ? { categoryId: deleteCategoryId } : {}),
        },
      });
    } else if (deleteStudentId && deleteCategoryId) {
      deleteResult = await prisma.performanceRecord.deleteMany({
        where: { studentId: deleteStudentId, categoryId: deleteCategoryId },
      });
    } else {
      return NextResponse.json({ error: 'Score record ID(s) or filter parameters are required for deletion.' }, { status: 400 });
    }

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'DELETE_SCORE',
      entity: 'PerformanceRecord',
      newValue: { count: deleteResult.count, idsSample: idsToDelete.slice(0, 50), examId: deleteExamId },
    });

    invalidateEngineCache();

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.count} score record(s).`,
      count: deleteResult.count,
      deletedCount: deleteResult.count,
    });
  } catch (error: any) {
    console.error('Delete score error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete score.' }, { status: 500 });
  }
}
