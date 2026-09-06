export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
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

    return NextResponse.json({
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

    if (!type || !id || !data) {
      return NextResponse.json({ error: 'Entity type, ID, and updated data are required.' }, { status: 400 });
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
          ...(data.active !== undefined ? { active: !!data.active } : {}),
        },
      });
    } else if (type === 'CLASS') {
      prevRecord = await prisma.academicClass.findUnique({ where: { id } });
      updatedRecord = await prisma.academicClass.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.numericGrade !== undefined ? { numericGrade: Number(data.numericGrade) } : {}),
          ...(data.active !== undefined ? { active: !!data.active } : {}),
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
          ...(data.institutionId !== undefined ? { institutionId: data.institutionId || null } : {}),
          ...(data.boardId !== undefined ? { boardId: data.boardId || null } : {}),
          ...(data.maxScore !== undefined ? { maxScore: Number(data.maxScore) } : {}),
        },
      });
    } else if (type === 'EXAM') {
      prevRecord = await prisma.exam.findUnique({ where: { id } });
      updatedRecord = await prisma.exam.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.categoryId ? { categoryId: data.categoryId } : {}),
          ...(data.termId ? { termId: data.termId } : {}),
          ...(data.academicYearId ? { academicYearId: data.academicYearId } : {}),
        },
      });
    } else if (type === 'TERM') {
      prevRecord = await prisma.term.findUnique({ where: { id } });
      updatedRecord = await prisma.term.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.code ? { code: data.code.trim() } : {}),
          ...(data.isCurrent !== undefined ? { isCurrent: !!data.isCurrent } : {}),
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
          ...(data.active !== undefined ? { active: !!data.active } : {}),
        },
      });
    } else if (type === 'PROGRAM') {
      prevRecord = await prisma.program.findUnique({ where: { id } });
      updatedRecord = await prisma.program.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.organizer !== undefined ? { organizer: data.organizer?.trim() || null } : {}),
          ...(data.levelId !== undefined ? { levelId: data.levelId || null } : {}),
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
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ error: 'Entity type and ID are required for deletion.' }, { status: 400 });
    }

    let prevRecord = null;

    if (type === 'SCHOOL') {
      await prisma.$transaction(async (tx) => {
        const students = await tx.student.findMany({ where: { schoolId: id }, select: { id: true } });
        const studentIds = students.map((s) => s.id);
        if (studentIds.length > 0) {
          await tx.performanceRecord.deleteMany({ where: { studentId: { in: studentIds } } });
          await tx.creativeHubSubmission.deleteMany({ where: { studentId: { in: studentIds } } });
          await tx.libraryRecord.deleteMany({ where: { studentId: { in: studentIds } } });
          await tx.student.deleteMany({ where: { id: { in: studentIds } } });
        }
        prevRecord = await tx.school.findUnique({ where: { id } });
        await tx.school.delete({ where: { id } });
      }, { timeout: 30000 });
    } else if (type === 'CLASS') {
      await prisma.$transaction(async (tx) => {
        const students = await tx.student.findMany({ where: { classId: id }, select: { id: true } });
        const studentIds = students.map((s) => s.id);
        if (studentIds.length > 0) {
          await tx.performanceRecord.deleteMany({ where: { studentId: { in: studentIds } } });
          await tx.creativeHubSubmission.deleteMany({ where: { studentId: { in: studentIds } } });
          await tx.libraryRecord.deleteMany({ where: { studentId: { in: studentIds } } });
          await tx.student.deleteMany({ where: { id: { in: studentIds } } });
        }
        prevRecord = await tx.academicClass.findUnique({ where: { id } });
        await tx.academicClass.delete({ where: { id } });
      }, { timeout: 30000 });
    } else if (type === 'SUBJECT') {
      await prisma.$transaction(async (tx) => {
        await tx.performanceRecord.deleteMany({ where: { subjectId: id } });
        prevRecord = await tx.subject.findUnique({ where: { id } });
        await tx.subject.delete({ where: { id } });
      }, { timeout: 30000 });
    } else if (type === 'EXAM') {
      await prisma.$transaction(async (tx) => {
        await tx.performanceRecord.deleteMany({ where: { examId: id } });
        prevRecord = await tx.exam.findUnique({ where: { id } });
        await tx.exam.delete({ where: { id } });
      }, { timeout: 30000 });
    } else if (type === 'TERM') {
      await prisma.$transaction(async (tx) => {
        await tx.performanceRecord.deleteMany({ where: { termId: id } });
        const exams = await tx.exam.findMany({ where: { termId: id }, select: { id: true } });
        const examIds = exams.map((e) => e.id);
        if (examIds.length > 0) {
          await tx.performanceRecord.deleteMany({ where: { examId: { in: examIds } } });
          await tx.exam.deleteMany({ where: { id: { in: examIds } } });
        }
        prevRecord = await tx.term.findUnique({ where: { id } });
        await tx.term.delete({ where: { id } });
      }, { timeout: 30000 });
    } else if (type === 'LEVEL') {
      await prisma.$transaction(async (tx) => {
        await tx.performanceRecord.deleteMany({ where: { levelId: id } });
        await tx.literaryCompetition.updateMany({ where: { levelId: id }, data: { levelId: null } });
        await tx.program.updateMany({ where: { levelId: id }, data: { levelId: null } });
        prevRecord = await tx.level.findUnique({ where: { id } });
        await tx.level.delete({ where: { id } });
      }, { timeout: 30000 });
    } else if (type === 'PROGRAM') {
      await prisma.$transaction(async (tx) => {
        const comps = await tx.competition.findMany({ where: { programId: id }, select: { id: true } });
        const compIds = comps.map((c) => c.id);
        if (compIds.length > 0) {
          await tx.performanceRecord.deleteMany({ where: { competitionId: { in: compIds } } });
          await tx.competition.deleteMany({ where: { id: { in: compIds } } });
        }
        prevRecord = await tx.program.findUnique({ where: { id } });
        await tx.program.delete({ where: { id } });
      }, { timeout: 30000 });
    } else if (type === 'COMPETITION') {
      await prisma.$transaction(async (tx) => {
        await tx.performanceRecord.deleteMany({ where: { competitionId: id } });
        prevRecord = await tx.competition.findUnique({ where: { id } });
        await tx.competition.delete({ where: { id } });
      }, { timeout: 30000 });
    } else {
      return NextResponse.json({ error: 'Invalid entity type specified.' }, { status: 400 });
    }

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'DELETE',
      entity: type,
      entityId: id,
      previousValue: prevRecord,
    });

    return NextResponse.json({
      success: true,
      message: `${type} deleted successfully.`,
    });
  } catch (error: any) {
    console.error('Academic master delete error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete record. Check if linked records exist.' }, { status: 500 });
  }
}

