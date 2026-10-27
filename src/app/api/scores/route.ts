export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { normalizeScoreToPercentage, invalidateEngineCache, onInvalidateEngine } from '@/lib/spr-engine';

const scoresMemoryCache = new Map<string, { timestamp: number; data: any }>();
const SCORES_MEMORY_TTL = 90 * 1000; // 90 seconds (invalidated on any score mutation)

function clearScoresMemoryCache() {
  scoresMemoryCache.clear();
}

onInvalidateEngine(() => {
  scoresMemoryCache.clear();
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const subcategoryId = searchParams.get('subcategoryId');
    const examId = searchParams.get('examId');
    const subjectId = searchParams.get('subjectId');
    const competitionId = searchParams.get('competitionId');
    const literaryCompetitionId = searchParams.get('literaryCompetitionId');
    const classId = searchParams.get('classId');
    const termId = searchParams.get('termId');
    const academicYearId = searchParams.get('academicYearId');
    const studentId = searchParams.get('studentId');
    const limit = parseInt(searchParams.get('limit') || '500', 10);

    const cacheKey = searchParams.toString() || 'all';
    const cached = scoresMemoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SCORES_MEMORY_TTL) {
      return NextResponse.json(
        { records: cached.data },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          },
        }
      );
    }

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (subcategoryId) where.subcategoryId = subcategoryId;
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
      select: {
        id: true,
        studentId: true,
        categoryId: true,
        subcategoryId: true,
        subjectId: true,
        examId: true,
        competitionId: true,
        literaryCompetitionId: true,
        levelId: true,
        termId: true,
        academicYearId: true,
        obtainedScore: true,
        maxScore: true,
        percentage: true,
        position: true,
        grade: true,
        remarks: true,
        date: true,
        createdAt: true,
        student: {
          select: {
            id: true,
            studentId: true,
            sprStudentId: true,
            fullName: true,
            division: true,
            status: true,
            classId: true,
            schoolId: true,
            class: {
              select: { id: true, name: true },
            },
            school: {
              select: { id: true, name: true },
            },
          },
        },
        category: {
          select: { id: true, name: true, code: true, defaultWeight: true },
        },
        subcategory: {
          select: { id: true, name: true, code: true, weight: true, maxScore: true, categoryId: true },
        },
        subject: {
          select: { id: true, name: true, code: true, maxScore: true },
        },
        exam: {
          select: { id: true, name: true, maxScore: true, targetScore: true, categoryId: true, termId: true },
        },
        competition: {
          select: {
            id: true,
            name: true,
            program: { select: { id: true, name: true } },
          },
        },
        literaryCompetition: {
          select: {
            id: true,
            name: true,
            event: { select: { id: true, name: true } },
            level: { select: { id: true, name: true, weightMultiplier: true } },
          },
        },
        level: {
          select: { id: true, name: true, weightMultiplier: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    scoresMemoryCache.set(cacheKey, { timestamp: Date.now(), data: records });

    return NextResponse.json(
      { records },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
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
          select: {
            id: true,
            studentId: true,
            categoryId: true,
            subcategoryId: true,
            examId: true,
            subjectId: true,
            competitionId: true,
            literaryCompetitionId: true,
            termId: true,
            levelId: true,
            position: true,
            grade: true,
            date: true,
            remarks: true,
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
            date: entry.date ? new Date(entry.date) : (date ? new Date(date) : existing.date),
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
            date: entry.date ? new Date(entry.date) : (date ? new Date(date) : new Date()),
            remarks: entry.remarks || null,
            createdById: user?.id,
          },
        });
      }
    }

    const updates = writeActions.filter((a): a is { type: 'UPDATE'; id: string; data: any } => a.type === 'UPDATE');
    const creates = writeActions.filter((a): a is { type: 'CREATE'; data: any } => a.type === 'CREATE');

    let savedCount = 0;

    // Fast bulk create in single SQL statement
    if (creates.length > 0) {
      const createRes = await prisma.performanceRecord.createMany({
        data: creates.map((c) => c.data),
        skipDuplicates: true,
      });
      savedCount += createRes.count;
    }

    // Concurrent parallel updates
    if (updates.length > 0) {
      const updateResults = await Promise.all(
        updates.map((u) =>
          prisma.performanceRecord.update({
            where: { id: u.id },
            data: u.data,
          })
        )
      );
      savedCount += updateResults.length;
    }

    logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'SAVE_SCORES',
      entity: 'PerformanceRecord',
      newValue: { count: savedCount, categoryId: targetCategoryId, examId: resolvedExamId, subjectId: resolvedSubjectId },
    });

    invalidateEngineCache();
    clearScoresMemoryCache();

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${savedCount} score records.`,
      recordsCount: savedCount,
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
    const {
      id,
      obtainedScore,
      score,
      maxScore,
      remarks,
      levelId,
      position,
      grade,
      date,
      subjectId,
      examId,
      subcategoryId,
      programName,
      festivalName,
      competitionName,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Score record ID is required.' }, { status: 400 });
    }

    const existing = await prisma.performanceRecord.findUnique({
      where: { id },
      include: {
        competition: { include: { program: true } },
        literaryCompetition: { include: { event: true } },
        category: true,
        subcategory: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Score record not found.' }, { status: 404 });
    }

    const rawObtained = obtainedScore !== undefined ? obtainedScore : score;
    const obtained = rawObtained !== undefined ? Number(rawObtained) : existing.obtainedScore;
    const max = maxScore !== undefined ? Number(maxScore) : existing.maxScore;
    const percentage = normalizeScoreToPercentage(obtained, max);

    const cleanProg = (programName || festivalName || '').trim();
    const cleanComp = (competitionName || '').trim();

    let newSubcategoryId = subcategoryId !== undefined ? subcategoryId : existing.subcategoryId;
    let newCompetitionId = existing.competitionId;
    let newLiteraryCompetitionId = existing.literaryCompetitionId;

    // Handle updates to Competition / Program or LiteraryCompetition / LiteraryEvent
    if (cleanComp || cleanProg) {
      const isLiterary =
        existing.category?.code === 'LITERARY' ||
        existing.literaryCompetitionId !== null ||
        (existing.remarks && (existing.remarks.toLowerCase().includes('sahityotsav') || existing.remarks.toLowerCase().includes('fest') || existing.remarks.toLowerCase().includes('kalotsav') || existing.remarks.toLowerCase().includes('mahrajan')));

      if (isLiterary) {
        if (existing.literaryCompetitionId && existing.literaryCompetition) {
          if (cleanComp && cleanComp !== existing.literaryCompetition.name) {
            await prisma.literaryCompetition.update({
              where: { id: existing.literaryCompetitionId },
              data: { name: cleanComp },
            });
          }
          if (cleanProg && existing.literaryCompetition.eventId && cleanProg !== existing.literaryCompetition.event?.name) {
            await prisma.literaryEvent.update({
              where: { id: existing.literaryCompetition.eventId },
              data: { name: cleanProg },
            });
          }
        } else if (cleanComp) {
          const eventTitle = cleanProg || 'Sahityotsav';
          let litEv = await prisma.literaryEvent.findFirst({
            where: { name: { equals: eventTitle, mode: 'insensitive' } },
          });
          if (!litEv) {
            litEv = await prisma.literaryEvent.create({
              data: {
                name: eventTitle,
                code: `EVENT_${eventTitle.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 15)}_${Date.now().toString(36).slice(-4).toUpperCase()}`,
                academicYearId: existing.academicYearId || (await prisma.academicYear.findFirst())?.id!,
              },
            });
          }
          let litC = await prisma.literaryCompetition.findFirst({
            where: {
              eventId: litEv.id,
              name: { equals: cleanComp, mode: 'insensitive' },
            },
          });
          if (!litC) {
            litC = await prisma.literaryCompetition.create({
              data: {
                name: cleanComp,
                eventId: litEv.id,
                levelId: levelId || existing.levelId,
                maxScore: max,
              },
            });
          }
          newLiteraryCompetitionId = litC.id;
        }

        if (cleanProg) {
          const matchedSub = await prisma.subcategory.findFirst({
            where: {
              categoryId: existing.categoryId,
              OR: [
                { name: { equals: cleanProg, mode: 'insensitive' } },
                { code: { equals: cleanProg, mode: 'insensitive' } },
              ],
            },
          });
          if (matchedSub) {
            newSubcategoryId = matchedSub.id;
          }
        }
      } else {
        // Programs & Competitions
        if (existing.competitionId && existing.competition) {
          if (cleanComp && cleanComp !== existing.competition.name) {
            await prisma.competition.update({
              where: { id: existing.competitionId },
              data: { name: cleanComp },
            });
          }
          if (cleanProg && existing.competition.programId && cleanProg !== existing.competition.program?.name) {
            await prisma.program.update({
              where: { id: existing.competition.programId },
              data: { name: cleanProg },
            });
          }
        } else if (cleanComp) {
          const progTitle = cleanProg || 'Madin Talent Olympiad';
          let prog = await prisma.program.findFirst({
            where: { name: { equals: progTitle, mode: 'insensitive' } },
          });
          if (!prog) {
            prog = await prisma.program.create({
              data: {
                name: progTitle,
                academicYearId: existing.academicYearId || (await prisma.academicYear.findFirst())?.id!,
              },
            });
          }
          let comp = await prisma.competition.findFirst({
            where: {
              programId: prog.id,
              name: { equals: cleanComp, mode: 'insensitive' },
            },
          });
          if (!comp) {
            comp = await prisma.competition.create({
              data: {
                name: cleanComp,
                programId: prog.id,
                maxScore: max,
              },
            });
          }
          newCompetitionId = comp.id;
        }

        if (cleanProg) {
          const matchedSub = await prisma.subcategory.findFirst({
            where: {
              categoryId: existing.categoryId,
              OR: [
                { name: { equals: cleanProg, mode: 'insensitive' } },
                { code: { equals: cleanProg, mode: 'insensitive' } },
              ],
            },
          });
          if (matchedSub) {
            newSubcategoryId = matchedSub.id;
          }
        }
      }
    }

    // Format remarks if cleanProg and cleanComp are provided
    let finalRemarks = remarks !== undefined ? remarks : existing.remarks;
    if (cleanProg && cleanComp) {
      if (!finalRemarks || !finalRemarks.includes('-')) {
        finalRemarks = `${cleanProg} - ${cleanComp}${position ? '. ' + position + ' Position' : ''}${grade ? '. ' + grade + ' Grade' : ''}`;
      } else {
        const parts = finalRemarks.split('-');
        const afterDash = parts.slice(1).join('-').trim();
        const dotIndex = afterDash.indexOf('.');
        const suffix = dotIndex !== -1 ? afterDash.slice(dotIndex) : '';
        finalRemarks = `${cleanProg} - ${cleanComp}${suffix}`;
      }
    }

    const updated = await prisma.performanceRecord.update({
      where: { id },
      data: {
        obtainedScore: obtained,
        maxScore: max,
        percentage,
        ...(finalRemarks !== undefined ? { remarks: finalRemarks } : {}),
        ...(position !== undefined ? { position } : {}),
        ...(grade !== undefined ? { grade } : {}),
        ...(levelId !== undefined ? { levelId } : {}),
        ...(newSubcategoryId !== undefined ? { subcategoryId: newSubcategoryId } : {}),
        ...(newCompetitionId !== undefined ? { competitionId: newCompetitionId } : {}),
        ...(newLiteraryCompetitionId !== undefined ? { literaryCompetitionId: newLiteraryCompetitionId } : {}),
        ...(subjectId !== undefined ? { subjectId } : {}),
        ...(examId !== undefined ? { examId } : {}),
        ...(date ? { date: new Date(date) } : {}),
        updatedById: user?.id,
      },
      include: {
        student: true,
        category: true,
        subcategory: true,
        competition: { include: { program: true } },
        literaryCompetition: { include: { event: true } },
      },
    });

    logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'UPDATE_SCORE',
      entity: 'PerformanceRecord',
      entityId: id,
      previousValue: existing,
      newValue: updated,
    });

    invalidateEngineCache();
    clearScoresMemoryCache();

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

    logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'DELETE_SCORE',
      entity: 'PerformanceRecord',
      newValue: { count: deleteResult.count, idsSample: idsToDelete.slice(0, 50), examId: deleteExamId },
    });

    invalidateEngineCache();
    clearScoresMemoryCache();

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
