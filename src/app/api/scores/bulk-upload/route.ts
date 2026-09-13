export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { normalizeScoreToPercentage, invalidateEngineCache } from '@/lib/spr-engine';

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const {
      categoryId,
      examId,
      examName,
      subjectId,
      subjectName,
      competitionId,
      competitionName,
      festivalName,
      literaryCompetitionId,
      levelId,
      levelName,
      termId,
      academicYearId,
      stream,
      institutionId,
      records, // Array of student rows (supports single score, multi-subject array, or key-value map)
    } = body;

    if (!categoryId || !records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'Category ID and at least one valid student record row are required.' },
        { status: 400 }
      );
    }

    let currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } }) ||
      await prisma.academicYear.findFirst();

    if (!currentYear) {
      currentYear = await prisma.academicYear.create({
        data: {
          name: '2025-2026',
          isCurrent: true,
          startDate: new Date('2025-06-01'),
          endDate: new Date('2026-03-31'),
        },
      });
    }

    let currentTerm = await prisma.term.findFirst({ where: { isCurrent: true } }) ||
      await prisma.term.findFirst();

    if (!currentTerm) {
      currentTerm = await prisma.term.create({
        data: {
          name: 'Term 1',
          code: 'T1',
          academicYearId: currentYear.id,
          isCurrent: true,
        },
      });
      await prisma.term.createMany({
        data: [
          { name: 'Term 2', code: 'T2', academicYearId: currentYear.id, isCurrent: false },
          { name: 'Term 3', code: 'T3', academicYearId: currentYear.id, isCurrent: false },
          { name: 'Annual', code: 'ANNUAL', academicYearId: currentYear.id, isCurrent: false },
        ],
        skipDuplicates: true,
      });
    }

    // Resolve or Auto-Create Exam on-the-fly if examName is typed ontime
    let resolvedExamId = examId || null;
    if (!resolvedExamId && examName && examName.trim()) {
      const eName = examName.trim();
      let existingExam = await prisma.exam.findFirst({
        where: {
          categoryId,
          name: { equals: eName },
        },
      });
      if (!existingExam) {
        existingExam = await prisma.exam.create({
          data: {
            name: eName,
            categoryId,
            termId: termId || currentTerm.id,
            academicYearId: academicYearId || currentYear.id,
          },
        });
      }
      resolvedExamId = existingExam.id;
    }

    // Resolve Level if levelName is provided
    let resolvedLevelId = levelId || null;
    if (!resolvedLevelId && levelName && levelName.trim()) {
      const lName = levelName.trim().toUpperCase();
      const existingLvl = await prisma.level.findFirst({
        where: {
          OR: [{ name: { equals: lName } }, { code: { equals: lName } }],
        },
      });
      if (existingLvl) resolvedLevelId = existingLvl.id;
    }

    // Resolve Institution from stream if specified
    let resolvedInstitutionId = institutionId || null;
    if (!resolvedInstitutionId && stream) {
      const inst = await prisma.academicInstitution.findFirst({
        where: {
          OR: [
            { code: { equals: stream.toUpperCase() } },
            { name: { contains: stream, mode: 'insensitive' } },
          ],
        },
      });
      if (inst) resolvedInstitutionId = inst.id;
    }

    // Fetch all students for rapid in-memory matching
    const allStudents = await prisma.student.findMany();
    const studentMapById = new Map<string, (typeof allStudents)[0]>();
    const studentMapByName = new Map<string, (typeof allStudents)[0]>();
    allStudents.forEach((s) => {
      if (s.studentId) studentMapById.set(s.studentId.trim().toLowerCase(), s);
      if (s.sprStudentId) studentMapById.set(s.sprStudentId.trim().toLowerCase(), s);
      if (s.id) studentMapById.set(s.id.trim().toLowerCase(), s);
      if (s.fullName) studentMapByName.set(s.fullName.trim().toLowerCase(), s);
    });

    // All subcategories for automatic matching
    const allSubcategories = await prisma.subcategory.findMany({ include: { category: true } });

    const resolveSubcategoryId = (festOrSubName?: string, explicitSubId?: string, catId?: string): string | null => {
      if (explicitSubId) {
        const matched = allSubcategories.find((s) => s.id === explicitSubId || s.code === explicitSubId);
        if (matched) return matched.id;
      }
      if (!festOrSubName) return null;
      const str = festOrSubName.trim().toLowerCase();

      // Special match rules for festivals
      if (str.includes('sahityotsav') || str.includes('sahithyotsav')) {
        const sub = allSubcategories.find((s) => s.code === 'SAHITYOTSAV' || s.name.toLowerCase().includes('sahityotsav'));
        if (sub) return sub.id;
      }
      if (str.includes('kalotsav') || str.includes('kalotsavam')) {
        const sub = allSubcategories.find((s) => s.code === 'KALOTSAV' || s.name.toLowerCase().includes('kalotsav'));
        if (sub) return sub.id;
      }
      if (str.includes('m-lit') || str.includes('mlit') || str.includes('m_lit')) {
        const sub = allSubcategories.find((s) => s.code === 'M_LIT_FEST' || s.name.toLowerCase().includes('m-lit'));
        if (sub) return sub.id;
      }
      if (str.includes('mahrajan') || str.includes('maharjan') || str.includes('jamia')) {
        const sub = allSubcategories.find((s) => s.code === 'JAMIA_MAHARJAN' || s.name.toLowerCase().includes('mahr') || s.name.toLowerCase().includes('jamia'));
        if (sub) return sub.id;
      }
      if (str.includes('shastramela')) {
        const sub = allSubcategories.find((s) => s.code.startsWith('SHASTRAMELA') || s.name.toLowerCase().includes('shastramela'));
        if (sub) return sub.id;
      }

      // Generic match by subcategory name/code
      const generic = allSubcategories.find((s) => {
        if (catId && s.categoryId !== catId) return false;
        return s.name.toLowerCase() === str || s.code.toLowerCase() === str || str.includes(s.name.toLowerCase());
      });
      return generic?.id || null;
    };

    // Subject cache to minimize database hits when auto-creating ontime subjects
    const subjectCache = new Map<string, string>();
    const existingSubjects = await prisma.subject.findMany({ where: { categoryId } });
    existingSubjects.forEach((s) => subjectCache.set(s.name.trim().toLowerCase(), s.id));

    // Event & Competition caches
    const eventCache = new Map<string, string>();
    const existingEvents = await prisma.literaryEvent.findMany();
    existingEvents.forEach((e) => eventCache.set(e.name.trim().toLowerCase(), e.id));

    const competitionCache = new Map<string, string>();
    const existingLitCompetitions = await prisma.literaryCompetition.findMany({ include: { event: true } });
    existingLitCompetitions.forEach((c) => {
      const eventName = (c.event?.name || 'Festival').trim().toLowerCase();
      const compKey = `${eventName}:::${c.name.trim().toLowerCase()}:::${c.levelId || ''}`;
      competitionCache.set(compKey, c.id);
    });

    let successCount = 0;
    let errorCount = 0;
    const errorDetails: string[] = [];

    // Helper to resolve or create subject on-the-fly
    const getOrCreateSubjectId = async (sName: string, maxScoreVal: number = 100): Promise<string> => {
      const cleanName = sName.trim();
      const key = cleanName.toLowerCase();
      if (subjectCache.has(key)) return subjectCache.get(key)!;

      const baseCode = cleanName.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 15);
      const uniqueCode = `SUB_${baseCode}_${Date.now().toString().slice(-4)}`;

      const created = await prisma.subject.create({
        data: {
          name: cleanName,
          code: uniqueCode,
          categoryId,
          institutionId: resolvedInstitutionId,
          maxScore: maxScoreVal,
        },
      });
      subjectCache.set(key, created.id);
      return created.id;
    };

    // Helper to resolve or create festival/programme competition on-the-fly
    const getOrCreateCompetitionId = async (
      compName: string,
      festTitle: string = 'Festival',
      maxScoreVal: number = 100,
      lvlId?: string | null
    ): Promise<{ isLit: boolean; id: string; eventId: string; subcategoryId: string | null }> => {
      const cleanName = compName.trim();
      const cleanFest = (festTitle || 'Festival').trim();
      const targetLevelId = lvlId || resolvedLevelId || null;
      const compKey = `${cleanFest.toLowerCase()}:::${cleanName.toLowerCase()}:::${targetLevelId || ''}`;

      const resolvedSubId = resolveSubcategoryId(cleanFest, undefined, categoryId);

      const festKey = cleanFest.toLowerCase();
      let eventId = eventCache.get(festKey);
      if (!eventId) {
        let litEvent = await prisma.literaryEvent.findFirst({
          where: { name: { equals: cleanFest, mode: 'insensitive' } },
        });
        if (!litEvent) {
          const eventCode = `EVENT_${cleanFest.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 15)}_${Date.now().toString(36).slice(-4).toUpperCase()}`;
          litEvent = await prisma.literaryEvent.create({
            data: {
              name: cleanFest,
              code: eventCode,
              academicYearId: academicYearId || currentYear.id,
            },
          });
        }
        eventId = litEvent.id;
        eventCache.set(festKey, eventId);
      }

      if (competitionCache.has(compKey)) {
        return { isLit: true, id: competitionCache.get(compKey)!, eventId, subcategoryId: resolvedSubId };
      }

      let existingComp = await prisma.literaryCompetition.findFirst({
        where: {
          eventId,
          name: { equals: cleanName, mode: 'insensitive' },
          ...(targetLevelId ? { levelId: targetLevelId } : {}),
        },
      });

      if (!existingComp) {
        existingComp = await prisma.literaryCompetition.create({
          data: {
            name: cleanName,
            eventId,
            levelId: targetLevelId,
            maxScore: maxScoreVal,
          },
        });
      }

      competitionCache.set(compKey, existingComp.id);
      return { isLit: true, id: existingComp.id, eventId, subcategoryId: resolvedSubId };
    };

    // --- PRE-RESOLVE / PRE-CREATE ON-THE-FLY SUBJECTS & COMPETITIONS BEFORE TRANSACTION ---
    for (const row of records) {
      if (row.subjectScores && Array.isArray(row.subjectScores)) {
        for (const sub of row.subjectScores) {
          const sName = sub.subjectName || sub.name;
          if (sName) await getOrCreateSubjectId(sName, Number(sub.maxScore) || 100);
        }
      }
      if (row.programmeScores && Array.isArray(row.programmeScores)) {
        for (const prog of row.programmeScores) {
          const cName = prog.competitionName || prog.name;
          if (cName) await getOrCreateCompetitionId(cName, prog.festivalName || prog.festName || festivalName || 'Festival', Number(prog.maxScore) || 50, prog.levelId || row.levelId || resolvedLevelId);
        }
      }
      if (row.subjectName) {
        await getOrCreateSubjectId(row.subjectName, Number(row.maxScore) || 100);
      }
      if (row.competitionName) {
        await getOrCreateCompetitionId(row.competitionName, row.festivalName || festivalName || 'Festival', Number(row.maxScore) || 50, row.levelId || resolvedLevelId);
      }
    }
    if (subjectName) await getOrCreateSubjectId(subjectName, 100);
    if (competitionName) await getOrCreateCompetitionId(competitionName, festivalName || 'Festival', 100, resolvedLevelId);

    // Collect valid student records
    const studentRows: Array<{ student: (typeof allStudents)[0]; row: any; index: number }> = [];
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowIdentifier = row.studentId || row.studentName || row.id || row.name;

      if (!rowIdentifier) {
        errorCount++;
        errorDetails.push(`Row ${i + 1}: Missing student identifier.`);
        continue;
      }

      const idKey = String(rowIdentifier).trim().toLowerCase();
      const student = studentMapById.get(idKey) || studentMapByName.get(idKey);

      if (!student) {
        errorCount++;
        errorDetails.push(`Row ${i + 1}: Student "${rowIdentifier}" not found in SPR registry.`);
        continue;
      }

      studentRows.push({ student, row, index: i });
    }

    // Pre-fetch all existing performance records for these students in this category & term
    const matchedStudentIds = Array.from(new Set(studentRows.map((s) => s.student.id)));
    const activeTermId = termId || currentTerm.id;
    const activeYearId = academicYearId || currentYear.id;

    const existingRecords = matchedStudentIds.length > 0
      ? await prisma.performanceRecord.findMany({
          where: {
            studentId: { in: matchedStudentIds },
            categoryId,
            termId: activeTermId,
          },
        })
      : [];

    type WriteAction =
      | { type: 'UPDATE'; id: string; data: any }
      | { type: 'CREATE'; data: any };

    const writeActions: WriteAction[] = [];

    const findExistingSubjectRecord = (
      studentId: string,
      subId: string,
      eId?: string | null
    ) => {
      return existingRecords.find((r) => {
        if (r.studentId !== studentId) return false;
        if (r.categoryId !== categoryId) return false;
        if (r.termId !== activeTermId) return false;
        if (r.subjectId !== subId) return false;
        if (eId && r.examId && r.examId !== eId) return false;
        return true;
      });
    };

    for (const { student, row, index } of studentRows) {
      // Case A: Multi-Subject columns (e.g. subjectScores array)
      if (row.subjectScores && Array.isArray(row.subjectScores) && row.subjectScores.length > 0) {
        for (const subEntry of row.subjectScores) {
          const rawScore = subEntry.score ?? subEntry.obtainedScore ?? subEntry.marks;
          if (rawScore === undefined || rawScore === null || rawScore === '') continue;

          const obtainedScore = Number(rawScore);
          if (isNaN(obtainedScore) || obtainedScore < 0) continue;

          const maxScore = Number(subEntry.maxScore) || 100;
          const percentage = normalizeScoreToPercentage(obtainedScore, maxScore);
          const targetSubjectName = subEntry.subjectName || subEntry.name || 'Subject';
          const subId = await getOrCreateSubjectId(targetSubjectName, maxScore);

          const existing = findExistingSubjectRecord(student.id, subId, resolvedExamId);

          if (existing) {
            writeActions.push({
              type: 'UPDATE',
              id: existing.id,
              data: {
                obtainedScore,
                maxScore,
                percentage,
                remarks: subEntry.remarks || row.remarks || existing.remarks,
                updatedById: user?.id,
              },
            });
          } else {
            writeActions.push({
              type: 'CREATE',
              data: {
                studentId: student.id,
                categoryId,
                subjectId: subId,
                examId: resolvedExamId,
                levelId: resolvedLevelId,
                termId: activeTermId,
                academicYearId: activeYearId,
                obtainedScore,
                maxScore,
                percentage,
                remarks: subEntry.remarks || row.remarks || null,
                createdById: user?.id,
              },
            });
          }
        }
        continue;
      }

      // Case B: Multi-Programme / Multi-Event array (e.g. programmeScores array)
      if (row.programmeScores && Array.isArray(row.programmeScores) && row.programmeScores.length > 0) {
        for (const progEntry of row.programmeScores) {
          const rawScore = progEntry.score ?? progEntry.obtainedScore ?? progEntry.marks;
          if (rawScore === undefined || rawScore === null || rawScore === '') continue;

          const obtainedScore = Number(rawScore);
          if (isNaN(obtainedScore) || obtainedScore < 0) continue;

          const maxScore = Number(progEntry.maxScore) || 50;
          const percentage = normalizeScoreToPercentage(obtainedScore, maxScore);
          const eventName = progEntry.competitionName || progEntry.name || 'Event';
          const festTitle = progEntry.festivalName || progEntry.festName || festivalName || 'Festival';
          const entryLevelId = progEntry.levelId || row.levelId || resolvedLevelId;

          const compInfo = await getOrCreateCompetitionId(eventName, festTitle, maxScore, entryLevelId);
          const activeSubId = progEntry.subcategoryId || row.subcategoryId || compInfo.subcategoryId;

          // Always create as separate distinct performance record for each competition award
          writeActions.push({
            type: 'CREATE',
            data: {
              studentId: student.id,
              categoryId,
              subcategoryId: activeSubId,
              literaryCompetitionId: compInfo.id,
              levelId: entryLevelId,
              position: progEntry.position || row.position || null,
              grade: progEntry.grade || row.grade || null,
              termId: activeTermId,
              academicYearId: activeYearId,
              obtainedScore,
              maxScore,
              percentage,
              remarks: progEntry.remarks || row.remarks || `${festTitle} - ${eventName}`,
              createdById: user?.id,
            },
          });
        }
        continue;
      }

      // Case C: Single Score Row
      const rawScore = row.score !== undefined ? row.score : row.marks || row.obtainedScore;
      const obtainedScore = Number(rawScore);

      if (isNaN(obtainedScore) || obtainedScore < 0) {
        errorCount++;
        errorDetails.push(`Row ${index + 1}: Invalid score "${rawScore}" for student ${student.fullName}.`);
        continue;
      }

      const maxScore = Number(row.maxScore) || 100;
      const percentage = normalizeScoreToPercentage(obtainedScore, maxScore);

      let activeSubjectId = subjectId || row.subjectId || null;
      if (!activeSubjectId && (row.subjectName || subjectName)) {
        activeSubjectId = await getOrCreateSubjectId(row.subjectName || subjectName, maxScore);
      }

      let activeLitCompId = literaryCompetitionId || row.literaryCompetitionId || null;
      let resolvedSubId: string | null = row.subcategoryId || null;

      const targetFestName = row.festivalName || festivalName || '';
      const targetCompName = row.competitionName || competitionName || '';

      if (!activeLitCompId && targetCompName) {
        const compInfo = await getOrCreateCompetitionId(targetCompName, targetFestName || 'Festival', maxScore, row.levelId || resolvedLevelId);
        activeLitCompId = compInfo.id;
        if (!resolvedSubId) resolvedSubId = compInfo.subcategoryId;
      }

      if (!resolvedSubId && targetFestName) {
        resolvedSubId = resolveSubcategoryId(targetFestName, undefined, categoryId);
      }

      // If explicit record ID is provided (e.g. from an edit action), perform update
      if (row.id && typeof row.id === 'string' && !row.id.startsWith('temp_')) {
        writeActions.push({
          type: 'UPDATE',
          id: row.id,
          data: {
            obtainedScore,
            maxScore,
            percentage,
            levelId: row.levelId || resolvedLevelId,
            subcategoryId: resolvedSubId,
            position: row.position !== undefined ? row.position : undefined,
            grade: row.grade !== undefined ? row.grade : undefined,
            remarks: row.remarks !== undefined ? row.remarks : undefined,
            updatedById: user?.id,
          },
        });
      } else if (activeSubjectId && resolvedExamId) {
        // Academic exam subject: update existing subject mark if present
        const existing = findExistingSubjectRecord(student.id, activeSubjectId, resolvedExamId);
        if (existing) {
          writeActions.push({
            type: 'UPDATE',
            id: existing.id,
            data: {
              obtainedScore,
              maxScore,
              percentage,
              remarks: row.remarks || existing.remarks,
              updatedById: user?.id,
            },
          });
        } else {
          writeActions.push({
            type: 'CREATE',
            data: {
              studentId: student.id,
              categoryId,
              examId: resolvedExamId,
              subjectId: activeSubjectId,
              subcategoryId: resolvedSubId,
              levelId: row.levelId || resolvedLevelId,
              termId: activeTermId,
              academicYearId: activeYearId,
              obtainedScore,
              maxScore,
              percentage,
              date: row.date ? new Date(row.date) : new Date(),
              remarks: row.remarks || null,
              createdById: user?.id,
            },
          });
        }
      } else {
        // Competition / Festival Award / Milestone: Always create as separate distinct record!
        writeActions.push({
          type: 'CREATE',
          data: {
            studentId: student.id,
            categoryId,
            examId: resolvedExamId,
            subjectId: activeSubjectId,
            subcategoryId: resolvedSubId,
            literaryCompetitionId: activeLitCompId,
            levelId: row.levelId || resolvedLevelId,
            position: row.position || null,
            grade: row.grade || null,
            termId: activeTermId,
            academicYearId: activeYearId,
            obtainedScore,
            maxScore,
            percentage,
            date: row.date ? new Date(row.date) : new Date(),
            remarks: row.remarks || (targetFestName && targetCompName ? `${targetFestName} - ${targetCompName}` : null),
            createdById: user?.id,
          },
        });
      }
    }

    // Execute writes in parallel batches for high throughput and PgBouncer safety
    const BATCH_SIZE = 25;
    for (let i = 0; i < writeActions.length; i += BATCH_SIZE) {
      const batch = writeActions.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (action) => {
          try {
            if (action.type === 'UPDATE') {
              await prisma.performanceRecord.update({
                where: { id: action.id },
                data: action.data,
              });
            } else {
              await prisma.performanceRecord.create({
                data: action.data,
              });
            }
            successCount++;
          } catch (err: any) {
            errorCount++;
            errorDetails.push(`Error writing score record: ${err.message}`);
          }
        })
      );
    }

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'BULK_UPLOAD_SCORES',
      entity: 'PerformanceRecord',
      newValue: { successCount, errorCount, categoryId, examName, subjectName },
    });

    invalidateEngineCache();

    return NextResponse.json({
      success: true,
      successCount,
      errorCount,
      errorDetails,
      message: `Bulk score recording completed: ${successCount} entries processed, ${errorCount} skipped.`,
    });
  } catch (error: any) {
    console.error('Bulk upload score error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process bulk score upload.' }, { status: 500 });
  }
}
