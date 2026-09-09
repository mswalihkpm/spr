export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { invalidateEngineCache } from '@/lib/spr-engine';
import { logAuditAction } from '@/lib/audit';

let cachedAcademicData: { timestamp: number; data: any } | null = null;
const ACADEMIC_CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

function invalidateAcademicCache() {
  cachedAcademicData = null;
  invalidateEngineCache();
}

export async function GET(req: NextRequest) {
  try {
    const now = Date.now();
    if (cachedAcademicData && now - cachedAcademicData.timestamp < ACADEMIC_CACHE_TTL_MS) {
      return NextResponse.json(cachedAcademicData.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      });
    }

    const { user, errorResponse } = await authenticateApiRequest(req, 'VIEWER');
    // Note: If no token, allow public GET of academic master data
    const [
      schools,
      classes,
      academicYears,
      terms,
      exams,
      subjects,
      levels,
      institutions,
      boards,
      categories,
      programs,
      competitions,
      literaryEvents,
    ] = await Promise.all([
      prisma.school.findMany({ orderBy: { name: 'asc' } }),
      prisma.academicClass.findMany({ orderBy: { numericGrade: 'asc' } }),
      prisma.academicYear.findMany({ orderBy: { name: 'desc' } }),
      prisma.term.findMany({ orderBy: { name: 'asc' } }),
      prisma.exam.findMany({ include: { category: true, term: true }, orderBy: { name: 'asc' } }),
      prisma.subject.findMany({ include: { category: true, institution: true, board: true }, orderBy: { name: 'asc' } }),
      prisma.level.findMany({ orderBy: { displayOrder: 'asc' } }),
      prisma.academicInstitution.findMany({ orderBy: { name: 'asc' } }),
      prisma.boardSyllabus.findMany({ orderBy: { name: 'asc' } }),
      prisma.category.findMany({ orderBy: { displayOrder: 'asc' } }),
      prisma.program.findMany({ include: { level: true, academicYear: true, competitions: true }, orderBy: { date: 'desc' } }),
      prisma.competition.findMany({ include: { program: true }, orderBy: { name: 'asc' } }),
      prisma.literaryEvent.findMany({ include: { competitions: true, academicYear: true }, orderBy: { date: 'desc' } }),
    ]);

    const payload = {
      schools,
      classes,
      academicYears,
      terms,
      exams,
      subjects,
      levels,
      institutions,
      boards,
      categories,
      programs,
      competitions,
      literaryEvents,
    };

    cachedAcademicData = { timestamp: now, data: payload };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    console.error('Academic master fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch academic master data.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { type, data } = body;

    let createdRecord = null;

    if (type === 'SCHOOL') {
      const code = data.code?.trim() || data.name.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 8);
      createdRecord = await prisma.school.create({
        data: { name: data.name.trim(), code },
      });
    } else if (type === 'CLASS') {
      createdRecord = await prisma.academicClass.create({
        data: { name: data.name.trim(), numericGrade: Number(data.numericGrade) || 0 },
      });
    } else if (type === 'SUBJECT') {
      let code = data.code?.trim() || data.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 10);
      const existing = await prisma.subject.findFirst({ where: { code } });
      if (existing) code = `${code}_${Date.now().toString(36).slice(-4).toUpperCase()}`;
      createdRecord = await prisma.subject.create({
        data: {
          name: data.name.trim(),
          code,
          categoryId: data.categoryId,
          institutionId: data.institutionId || null,
          boardId: data.boardId || null,
          maxScore: Number(data.maxScore) || 100,
        },
      });
    } else if (type === 'EXAM') {
      const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
      const currentTerm = await prisma.term.findFirst({ where: { isCurrent: true } });
      createdRecord = await prisma.exam.create({
        data: {
          name: data.name.trim(),
          categoryId: data.categoryId,
          termId: data.termId || currentTerm?.id || '',
          academicYearId: data.academicYearId || currentYear?.id || '',
        },
      });
    } else if (type === 'TERM') {
      const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
      let code = data.code?.trim() || data.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const existing = await prisma.term.findFirst({ where: { code } });
      if (existing) code = `${code}_${Date.now().toString(36).slice(-4).toUpperCase()}`;
      createdRecord = await prisma.term.create({
        data: {
          name: data.name.trim(),
          code,
          academicYearId: data.academicYearId || currentYear?.id || '',
          isCurrent: !!data.isCurrent,
        },
      });
    } else if (type === 'LEVEL') {
      let code = data.code?.trim() || data.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const existing = await prisma.level.findUnique({ where: { code } });
      if (existing) code = `${code}_${Date.now().toString(36).slice(-4).toUpperCase()}`;
      createdRecord = await prisma.level.create({
        data: {
          name: data.name.trim(),
          code,
          weightMultiplier: Number(data.weightMultiplier) || 1.0,
          displayOrder: Number(data.displayOrder) || 10,
        },
      });
    } else if (type === 'PROGRAM') {
      const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
      createdRecord = await prisma.program.create({
        data: {
          name: data.name.trim(),
          organizer: data.organizer?.trim() || null,
          levelId: data.levelId || null,
          academicYearId: data.academicYearId || currentYear?.id || '',
          date: data.date ? new Date(data.date) : new Date(),
        },
      });
    } else if (type === 'COMPETITION') {
      createdRecord = await prisma.competition.create({
        data: {
          name: data.name.trim(),
          programId: data.programId,
          maxScore: Number(data.maxScore) || 100,
          date: data.date ? new Date(data.date) : new Date(),
        },
      });
    } else {
      return NextResponse.json({ error: 'Invalid entity type specified.' }, { status: 400 });
    }

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'CREATE',
      entity: type,
      entityId: createdRecord.id,
      newValue: createdRecord,
    });

    invalidateAcademicCache();

    return NextResponse.json({
      success: true,
      data: createdRecord,
      message: `${type} created successfully.`,
    });
  } catch (error: any) {
    console.error('Academic master create error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create record.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { type, id, data } = body;

    if (!type || !id) {
      return NextResponse.json({ error: 'Entity type and ID are required for update.' }, { status: 400 });
    }

    let updatedRecord = null;
    let prevRecord = null;

    if (type === 'SCHOOL') {
      prevRecord = await prisma.school.findUnique({ where: { id } });
      updatedRecord = await prisma.school.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.code ? { code: data.code.trim() } : {}),
          ...(data.active !== undefined ? { active: Boolean(data.active) } : {}),
        },
      });
    } else if (type === 'CLASS') {
      prevRecord = await prisma.academicClass.findUnique({ where: { id } });
      updatedRecord = await prisma.academicClass.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.numericGrade !== undefined ? { numericGrade: Number(data.numericGrade) } : {}),
          ...(data.active !== undefined ? { active: Boolean(data.active) } : {}),
        },
      });
    } else if (type === 'SUBJECT') {
      prevRecord = await prisma.subject.findUnique({ where: { id } });
      updatedRecord = await prisma.subject.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.code ? { code: data.code.trim() } : {}),
          ...(data.categoryId ? { categoryId: data.categoryId } : {}),
          institutionId: data.institutionId !== undefined ? data.institutionId : undefined,
          boardId: data.boardId !== undefined ? data.boardId : undefined,
          ...(data.maxScore !== undefined ? { maxScore: Number(data.maxScore) } : {}),
        },
      });
    } else if (type === 'EXAM') {
      prevRecord = await prisma.exam.findUnique({ where: { id } });
      updatedRecord = await prisma.exam.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.code ? { code: data.code.trim() } : {}),
          ...(data.categoryId ? { categoryId: data.categoryId } : {}),
          ...(data.academicYearId ? { academicYearId: data.academicYearId } : {}),
          ...(data.termId ? { termId: data.termId } : {}),
          ...(data.maxScore !== undefined ? { maxScore: Number(data.maxScore) } : {}),
          ...(data.weight !== undefined ? { weight: Number(data.weight) } : {}),
        },
      });
    } else if (type === 'TERM') {
      prevRecord = await prisma.term.findUnique({ where: { id } });
      updatedRecord = await prisma.term.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.code ? { code: data.code.trim() } : {}),
          ...(data.isCurrent !== undefined ? { isCurrent: Boolean(data.isCurrent) } : {}),
        },
      });
    } else if (type === 'LEVEL') {
      prevRecord = await prisma.level.findUnique({ where: { id } });
      updatedRecord = await prisma.level.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.code ? { code: data.code.trim() } : {}),
          ...(data.weightMultiplier !== undefined ? { weightMultiplier: Number(data.weightMultiplier) } : {}),
          ...(data.displayOrder !== undefined ? { displayOrder: Number(data.displayOrder) } : {}),
        },
      });
    } else if (type === 'PROGRAM') {
      prevRecord = await prisma.program.findUnique({ where: { id } });
      updatedRecord = await prisma.program.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          organizer: data.organizer !== undefined ? data.organizer : undefined,
          levelId: data.levelId !== undefined ? data.levelId : undefined,
          ...(data.academicYearId ? { academicYearId: data.academicYearId } : {}),
          ...(data.date ? { date: new Date(data.date) } : {}),
        },
      });
    } else if (type === 'COMPETITION') {
      prevRecord = await prisma.competition.findUnique({ where: { id } });
      updatedRecord = await prisma.competition.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.programId ? { programId: data.programId } : {}),
          ...(data.maxScore !== undefined ? { maxScore: Number(data.maxScore) } : {}),
          ...(data.date ? { date: new Date(data.date) } : {}),
        },
      });
    } else {
      return NextResponse.json({ error: 'Invalid entity type specified.' }, { status: 400 });
    }

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'UPDATE',
      entity: type,
      entityId: id,
      previousValue: prevRecord,
      newValue: updatedRecord,
    });

    invalidateAcademicCache();

    return NextResponse.json({
      success: true,
      data: updatedRecord,
      message: `${type} updated successfully.`,
    });
  } catch (error: any) {
    console.error('Academic master update error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update record.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    let type = searchParams.get('type');
    const id = searchParams.get('id');

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body not JSON or empty
    }

    if (body.type) {
      type = body.type;
    }

    const idsToDelete: string[] = [];
    if (body.ids && Array.isArray(body.ids)) {
      idsToDelete.push(...body.ids);
    }
    if (id && !idsToDelete.includes(id)) {
      idsToDelete.push(id);
    }

    if (!type || idsToDelete.length === 0) {
      return NextResponse.json({ error: 'Entity type and ID(s) are required for deletion.' }, { status: 400 });
    }

    if (type === 'SCHOOL') {
      const schools = await prisma.school.findMany({ where: { id: { in: idsToDelete } } });
      if (schools.length === 0) return NextResponse.json({ success: true, message: 'Schools already removed.' });
      const validIds = schools.map((s) => s.id);
      const students = await prisma.student.findMany({ where: { schoolId: { in: validIds } }, select: { id: true } });
      const studentIds = students.map((s) => s.id);
      const ops: any[] = [];
      if (studentIds.length > 0) {
        ops.push(prisma.performanceRecord.deleteMany({ where: { studentId: { in: studentIds } } }));
        ops.push(prisma.creativeHubSubmission.deleteMany({ where: { studentId: { in: studentIds } } }));
        ops.push(prisma.libraryRecord.deleteMany({ where: { studentId: { in: studentIds } } }));
        ops.push(prisma.student.deleteMany({ where: { id: { in: studentIds } } }));
      }
      ops.push(prisma.school.deleteMany({ where: { id: { in: validIds } } }));
      await prisma.$transaction(ops);
    } else if (type === 'CLASS') {
      const classes = await prisma.academicClass.findMany({ where: { id: { in: idsToDelete } } });
      if (classes.length === 0) return NextResponse.json({ success: true, message: 'Classes already removed.' });
      const validIds = classes.map((c) => c.id);
      const students = await prisma.student.findMany({ where: { classId: { in: validIds } }, select: { id: true } });
      const studentIds = students.map((s) => s.id);
      const ops: any[] = [];
      if (studentIds.length > 0) {
        ops.push(prisma.performanceRecord.deleteMany({ where: { studentId: { in: studentIds } } }));
        ops.push(prisma.creativeHubSubmission.deleteMany({ where: { studentId: { in: studentIds } } }));
        ops.push(prisma.libraryRecord.deleteMany({ where: { studentId: { in: studentIds } } }));
        ops.push(prisma.student.deleteMany({ where: { id: { in: studentIds } } }));
      }
      ops.push(prisma.academicClass.deleteMany({ where: { id: { in: validIds } } }));
      await prisma.$transaction(ops);
    } else if (type === 'SUBJECT') {
      const subjects = await prisma.subject.findMany({ where: { id: { in: idsToDelete } } });
      if (subjects.length === 0) return NextResponse.json({ success: true, message: 'Subjects already removed.' });
      const validIds = subjects.map((s) => s.id);
      await prisma.$transaction([
        prisma.performanceRecord.deleteMany({ where: { subjectId: { in: validIds } } }),
        prisma.subject.deleteMany({ where: { id: { in: validIds } } }),
      ]);
    } else if (type === 'EXAM') {
      const exams = await prisma.exam.findMany({ where: { id: { in: idsToDelete } } });
      if (exams.length === 0) return NextResponse.json({ success: true, message: 'Exams already removed.' });
      const validIds = exams.map((e) => e.id);
      await prisma.$transaction([
        prisma.performanceRecord.deleteMany({ where: { examId: { in: validIds } } }),
        prisma.exam.deleteMany({ where: { id: { in: validIds } } }),
      ]);
    } else if (type === 'TERM') {
      const terms = await prisma.term.findMany({ where: { id: { in: idsToDelete } } });
      if (terms.length === 0) return NextResponse.json({ success: true, message: 'Terms already removed.' });
      const validIds = terms.map((t) => t.id);
      const exams = await prisma.exam.findMany({ where: { termId: { in: validIds } }, select: { id: true } });
      const examIds = exams.map((e) => e.id);
      const ops: any[] = [
        prisma.performanceRecord.deleteMany({ where: { termId: { in: validIds } } }),
      ];
      if (examIds.length > 0) {
        ops.push(prisma.performanceRecord.deleteMany({ where: { examId: { in: examIds } } }));
        ops.push(prisma.exam.deleteMany({ where: { id: { in: examIds } } }));
      }
      ops.push(prisma.term.deleteMany({ where: { id: { in: validIds } } }));
      await prisma.$transaction(ops);
    } else if (type === 'LEVEL') {
      const levels = await prisma.level.findMany({ where: { id: { in: idsToDelete } } });
      if (levels.length === 0) return NextResponse.json({ success: true, message: 'Levels already removed.' });
      const validIds = levels.map((l) => l.id);
      await prisma.$transaction([
        prisma.performanceRecord.deleteMany({ where: { levelId: { in: validIds } } }),
        prisma.literaryCompetition.updateMany({ where: { levelId: { in: validIds } }, data: { levelId: null } }),
        prisma.program.updateMany({ where: { levelId: { in: validIds } }, data: { levelId: null } }),
        prisma.level.deleteMany({ where: { id: { in: validIds } } }),
      ]);
    } else if (type === 'PROGRAM') {
      const programs = await prisma.program.findMany({ where: { id: { in: idsToDelete } } });
      if (programs.length === 0) return NextResponse.json({ success: true, message: 'Programs already removed.' });
      const validIds = programs.map((p) => p.id);
      const comps = await prisma.competition.findMany({ where: { programId: { in: validIds } }, select: { id: true } });
      const compIds = comps.map((c) => c.id);
      const ops: any[] = [];
      if (compIds.length > 0) {
        ops.push(prisma.performanceRecord.deleteMany({ where: { competitionId: { in: compIds } } }));
        ops.push(prisma.competition.deleteMany({ where: { id: { in: compIds } } }));
      }
      ops.push(prisma.program.deleteMany({ where: { id: { in: validIds } } }));
      await prisma.$transaction(ops);
    } else if (type === 'COMPETITION') {
      const comps = await prisma.competition.findMany({ where: { id: { in: idsToDelete } } });
      if (comps.length === 0) return NextResponse.json({ success: true, message: 'Competitions already removed.' });
      const validIds = comps.map((c) => c.id);
      await prisma.$transaction([
        prisma.performanceRecord.deleteMany({ where: { competitionId: { in: validIds } } }),
        prisma.competition.deleteMany({ where: { id: { in: validIds } } }),
      ]);
    } else {
      return NextResponse.json({ error: 'Invalid entity type specified.' }, { status: 400 });
    }

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'BULK_DELETE',
      entity: type,
      newValue: { count: idsToDelete.length, ids: idsToDelete },
    });

    invalidateAcademicCache();

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${idsToDelete.length} ${type.toLowerCase()}(s).`,
      count: idsToDelete.length,
      deletedCount: idsToDelete.length,
    });
  } catch (error: any) {
    console.error('Academic master delete error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete record. Check if linked records exist.' }, { status: 500 });
  }
}


