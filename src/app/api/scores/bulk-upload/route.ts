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

    // Subject cache to minimize database hits when auto-creating ontime subjects
    const subjectCache = new Map<string, string>();
    const existingSubjects = await prisma.subject.findMany({ where: { categoryId } });
    existingSubjects.forEach((s) => subjectCache.set(s.name.trim().toLowerCase(), s.id));

    // Competition cache
    const competitionCache = new Map<string, string>();
    const existingLitCompetitions = await prisma.literaryCompetition.findMany();
    existingLitCompetitions.forEach((c) => competitionCache.set(c.name.trim().toLowerCase(), c.id));

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
    const getOrCreateCompetitionId = async (compName: string, festTitle: string = 'Festival', maxScoreVal: number = 100): Promise<{ isLit: boolean; id: string }> => {
      const cleanName = compName.trim();
      const key = cleanName.toLowerCase();
      if (competitionCache.has(key)) {
        return { isLit: true, id: competitionCache.get(key)! };
      }

      // Check or create LiteraryEvent
      let litEvent = await prisma.literaryEvent.findFirst({
        where: { name: { contains: festTitle, mode: 'insensitive' } },
      });
      if (!litEvent) {
        const eventCode = `EVENT_${festTitle.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 12)}_${Date.now().toString().slice(-3)}`;
        litEvent = await prisma.literaryEvent.create({
          data: {
            name: festTitle,
            code: eventCode,
            academicYearId: academicYearId || currentYear.id,
          },
        });
      }

      const createdComp = await prisma.literaryCompetition.create({
        data: {
          name: cleanName,
          eventId: litEvent.id,
          levelId: resolvedLevelId,
          maxScore: maxScoreVal,
        },
      });
      competitionCache.set(key, createdComp.id);
      return { isLit: true, id: createdComp.id };
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
          if (cName) await getOrCreateCompetitionId(cName, prog.festivalName || prog.festName || 'Festival', Number(prog.maxScore) || 50);
        }
      }
      if (row.subjectName) {
        await getOrCreateSubjectId(row.subjectName, Number(row.maxScore) || 100);
      }
      if (row.competitionName) {
        await getOrCreateCompetitionId(row.competitionName, row.festivalName || 'Festival', Number(row.maxScore) || 50);
      }
    }
    if (subjectName) await getOrCreateSubjectId(subjectName, 100);
    if (competitionName) await getOrCreateCompetitionId(competitionName, 'Festival', 100);

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

    // Pre-fetch all existing performance records for these students in this category & term in ONE single query
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

    const findExisting = (
      studentId: string,
      subId?: string | null,
      litCompId?: string | null,
      eId?: string | null
    ) => {
      return existingRecords.find((r) => {
        if (r.studentId !== studentId) return false;
        if (r.categoryId !== categoryId) return false;
        if (r.termId !== activeTermId) return false;
        if (subId && r.subjectId !== subId) return false;
        if (litCompId && r.literaryCompetitionId !== litCompId) return false;
        if (eId && r.examId && r.examId !== eId) return false;
        return true;
      });
    };

    for (const { student, row, index } of studentRows) {
      // Case A: Multi-Subject / Multi-Programme columns (e.g. subjectScores array or scores object)
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

          const existing = findExisting(student.id, subId, null, resolvedExamId);

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
            // Register stub in existingRecords to prevent duplicate creates if student+subject is repeated
            existingRecords.push({
              id: `temp_${Date.now()}_${Math.random()}`,
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
              updatedById: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              subcategoryId: null,
              eventId: null,
              competitionId: null,
              literaryCompetitionId: null,
              date: new Date(),
            } as any);
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
          const festTitle = progEntry.festivalName || progEntry.festName || 'Festival';

          const compInfo = await getOrCreateCompetitionId(eventName, festTitle, maxScore);

          const existing = findExisting(student.id, null, compInfo.id, null);

          if (existing) {
            writeActions.push({
              type: 'UPDATE',
              id: existing.id,
              data: {
                obtainedScore,
                maxScore,
                percentage,
                levelId: resolvedLevelId || existing.levelId,
                remarks: progEntry.remarks || row.remarks || existing.remarks,
                updatedById: user?.id,
              },
            });
          } else {
            writeActions.push({
              type: 'CREATE',
              data: {
                studentId: student.id,
                categoryId,
                literaryCompetitionId: compInfo.id,
                levelId: resolvedLevelId,
                termId: activeTermId,
                academicYearId: activeYearId,
                obtainedScore,
                maxScore,
                percentage,
                remarks: progEntry.remarks || row.remarks || `${festTitle} - ${eventName}`,
                createdById: user?.id,
              },
            });
            existingRecords.push({
              id: `temp_${Date.now()}_${Math.random()}`,
              studentId: student.id,
              categoryId,
              subjectId: null,
              examId: null,
              literaryCompetitionId: compInfo.id,
              competitionId: null,
              levelId: resolvedLevelId,
              termId: activeTermId,
              academicYearId: activeYearId,
              obtainedScore,
              maxScore,
              percentage,
              remarks: progEntry.remarks || row.remarks || `${festTitle} - ${eventName}`,
              createdById: user?.id,
              updatedById: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              subcategoryId: null,
              eventId: null,
              date: new Date(),
            } as any);
          }
        }
        continue;
      }

      // Case C: Single Score Row with dynamic on-the-fly subject/programme
      const rawScore = row.score !== undefined ? row.score : row.marks || row.obtainedScore;
      const obtainedScore = Number(rawScore);

      if (isNaN(obtainedScore) || obtainedScore < 0) {
        errorCount++;
        errorDetails.push(`Row ${index + 1}: Invalid score "${rawScore}" for student ${student.fullName}.`);
        continue;
      }

      const maxScore = Number(row.maxScore) || 100;
      const percentage = normalizeScoreToPercentage(obtainedScore, maxScore);

      let activeSubjectId = subjectId || null;
      if (!activeSubjectId && (row.subjectName || subjectName)) {
        activeSubjectId = await getOrCreateSubjectId(row.subjectName || subjectName, maxScore);
      }

      let activeLitCompId = literaryCompetitionId || null;
      if (!activeLitCompId && (row.competitionName || competitionName)) {
        const compInfo = await getOrCreateCompetitionId(row.competitionName || competitionName, row.festivalName || 'Festival', maxScore);
        activeLitCompId = compInfo.id;
      }

      const existing = findExisting(student.id, activeSubjectId, activeLitCompId, resolvedExamId);

      if (existing) {
        writeActions.push({
          type: 'UPDATE',
          id: existing.id,
          data: {
            obtainedScore,
            maxScore,
            percentage,
            levelId: resolvedLevelId || existing.levelId,
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
            literaryCompetitionId: activeLitCompId,
            levelId: resolvedLevelId,
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
        existingRecords.push({
          id: `temp_${Date.now()}_${Math.random()}`,
          studentId: student.id,
          categoryId,
          examId: resolvedExamId,
          subjectId: activeSubjectId,
          literaryCompetitionId: activeLitCompId,
          competitionId: null,
          levelId: resolvedLevelId,
          termId: activeTermId,
          academicYearId: activeYearId,
          obtainedScore,
          maxScore,
          percentage,
          remarks: row.remarks || null,
          createdById: user?.id,
          updatedById: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          subcategoryId: null,
          eventId: null,
          date: new Date(),
        } as any);
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
