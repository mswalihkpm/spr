import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fastParseCSV } from './fast_csv_parser';
import { uploadBase64StudentPhoto, generateTokenizedPhotoPath } from '../lib/supabase-storage';

// Load .env
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const k = trimmed.slice(0, idx).trim();
      let v = trimmed.slice(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[k] = v;
    }
  }
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.DIRECT_URL,
    },
  },
});

// Type casting helpers
const toInt = (v: any, def = 0): number => {
  if (v === null || v === undefined || v === '') return def;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? def : n;
};

const toNullableInt = (v: any): number | null => {
  if (v === null || v === undefined || v === '' || v === 'null') return null;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? null : n;
};

const toFloat = (v: any, def = 0.0): number => {
  if (v === null || v === undefined || v === '') return def;
  const n = parseFloat(String(v));
  return isNaN(n) ? def : n;
};

const toNullableFloat = (v: any): number | null => {
  if (v === null || v === undefined || v === '' || v === 'null') return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
};

const toBool = (v: any, def = false): boolean => {
  if (v === null || v === undefined || v === '') return def;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase().trim();
  return s === 'true' || s === 't' || s === '1';
};

const toDate = (v: any): Date | undefined => {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

const toNullableDate = (v: any): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const toNullableString = (v: any): string | null => {
  if (v === null || v === undefined || v === '' || v === 'null' || v === 'NULL') return null;
  return String(v);
};

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
}

export async function executeCsvMigration() {
  console.log('====================================================');
  console.log('  STARTING CSV MIGRATION TO NEW SUPABASE (MSOERATE)  ');
  console.log('====================================================\n');

  const csvDir = path.join(process.cwd(), 'backups', 'csv');
  if (!fs.existsSync(csvDir)) {
    throw new Error(`CSV directory not found at: ${csvDir}`);
  }

  function loadTable(tableName: string): Record<string, any>[] {
    const candidates = [
      path.join(csvDir, `${tableName}.csv`),
      path.join(csvDir, `${tableName}_rows.csv`),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return fastParseCSV(fs.readFileSync(p, 'utf-8'));
      }
    }
    return [];
  }

  const stats: Record<string, { total: number; inserted: number; skipped: number; errors: string[] }> = {};

  async function insertBatch<T extends { id?: string }>(
    modelName: string,
    records: T[],
    insertFn: (item: T) => Promise<any>
  ) {
    if (!records || records.length === 0) {
      stats[modelName] = { total: 0, inserted: 0, skipped: 0, errors: [] };
      console.log(`- ${modelName}: 0 records (empty/skipped).`);
      return;
    }

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of records) {
      try {
        await withRetry(() => insertFn(item));
        inserted++;
      } catch (err: any) {
        const errMsg = `[Error] ${modelName} (${item.id || 'unknown'}): ${err.message}`;
        console.error(errMsg);
        errors.push(errMsg);
        skipped++;
      }
    }

    stats[modelName] = { total: records.length, inserted, skipped, errors };
    console.log(`✓ ${modelName}: ${inserted}/${records.length} inserted/upserted (${skipped} failed)`);
  }

  // 1. Independent Master Records
  await insertBatch('School', loadTable('School'), (item) =>
    prisma.school.upsert({
      where: { id: item.id },
      update: {
        name: String(item.name),
        code: String(item.code),
        active: toBool(item.active, true),
      },
      create: {
        id: item.id,
        name: String(item.name),
        code: String(item.code),
        active: toBool(item.active, true),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  // Auto-provision AcademicInstitution & BoardSyllabus taxonomies referenced by Subject
  await prisma.academicInstitution.upsert({
    where: { id: 'cmtop8rtw000t4d8sge5o1lao' },
    update: {},
    create: { id: 'cmtop8rtw000t4d8sge5o1lao', name: "Ma'din Academy", code: 'MADIN_ACADEMY', active: true },
  });
  await prisma.academicInstitution.upsert({
    where: { id: 'cmtop8s24000u4d8sttpo4kt5' },
    update: {},
    create: { id: 'cmtop8s24000u4d8sttpo4kt5', name: 'Jamiathul Hind Al-Islamiyya', code: 'JAMIATHUL_HIND', active: true },
  });
  await prisma.boardSyllabus.upsert({
    where: { id: 'cmtop8saa000v4d8sqtlxwy1j' },
    update: {},
    create: { id: 'cmtop8saa000v4d8sqtlxwy1j', name: 'Kerala State Syllabus', code: 'KERALA_STATE', active: true },
  });
  await prisma.boardSyllabus.upsert({
    where: { id: 'cmtop8sik000w4d8sdqeb7nh0' },
    update: {},
    create: { id: 'cmtop8sik000w4d8sdqeb7nh0', name: 'NCERT / CBSE', code: 'NCERT', active: true },
  });

  await insertBatch('AcademicClass', loadTable('AcademicClass'), (item) =>
    prisma.academicClass.upsert({
      where: { id: item.id },
      update: {
        name: String(item.name),
        numericGrade: toInt(item.numericGrade, 0),
        active: toBool(item.active, true),
      },
      create: {
        id: item.id,
        name: String(item.name),
        numericGrade: toInt(item.numericGrade, 0),
        active: toBool(item.active, true),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  await insertBatch('AcademicYear', loadTable('AcademicYear'), (item) =>
    prisma.academicYear.upsert({
      where: { id: item.id },
      update: {
        name: String(item.name),
        isCurrent: toBool(item.isCurrent, false),
        startDate: toNullableDate(item.startDate),
        endDate: toNullableDate(item.endDate),
      },
      create: {
        id: item.id,
        name: String(item.name),
        isCurrent: toBool(item.isCurrent, false),
        startDate: toNullableDate(item.startDate),
        endDate: toNullableDate(item.endDate),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  await insertBatch('Level', loadTable('Level'), (item) =>
    prisma.level.upsert({
      where: { id: item.id },
      update: {
        name: String(item.name),
        code: String(item.code),
        weightMultiplier: toFloat(item.weightMultiplier, 1.0),
        displayOrder: toInt(item.displayOrder, 0),
        active: toBool(item.active, true),
      },
      create: {
        id: item.id,
        name: String(item.name),
        code: String(item.code),
        weightMultiplier: toFloat(item.weightMultiplier, 1.0),
        displayOrder: toInt(item.displayOrder, 0),
        active: toBool(item.active, true),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  await insertBatch('Category', loadTable('Category'), (item) =>
    prisma.category.upsert({
      where: { id: item.id },
      update: {
        code: String(item.code),
        name: String(item.name),
        description: toNullableString(item.description),
        icon: toNullableString(item.icon),
        isSystem: toBool(item.isSystem, false),
        active: toBool(item.active, true),
        displayOrder: toInt(item.displayOrder, 0),
        defaultWeight: toFloat(item.defaultWeight, 10.0),
        includeInSPR: toBool(item.includeInSPR, true),
      },
      create: {
        id: item.id,
        code: String(item.code),
        name: String(item.name),
        description: toNullableString(item.description),
        icon: toNullableString(item.icon),
        isSystem: toBool(item.isSystem, false),
        active: toBool(item.active, true),
        displayOrder: toInt(item.displayOrder, 0),
        defaultWeight: toFloat(item.defaultWeight, 10.0),
        includeInSPR: toBool(item.includeInSPR, true),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  await insertBatch('CreativeHubCategory', loadTable('CreativeHubCategory'), (item) =>
    prisma.creativeHubCategory.upsert({
      where: { id: item.id },
      update: {
        name: String(item.name),
        code: String(item.code),
        weight: toFloat(item.weight, 1.0),
        displayOrder: toInt(item.displayOrder, 0),
        active: toBool(item.active, true),
      },
      create: {
        id: item.id,
        name: String(item.name),
        code: String(item.code),
        weight: toFloat(item.weight, 1.0),
        displayOrder: toInt(item.displayOrder, 0),
        active: toBool(item.active, true),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  await insertBatch('PublishedMedia', loadTable('PublishedMedia'), (item) =>
    prisma.publishedMedia.upsert({
      where: { id: item.id },
      update: {
        name: String(item.name),
        code: toNullableString(item.code),
        weight: toFloat(item.weight, 1.0),
        active: toBool(item.active, true),
      },
      create: {
        id: item.id,
        name: String(item.name),
        code: toNullableString(item.code),
        weight: toFloat(item.weight, 1.0),
        active: toBool(item.active, true),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  await insertBatch('SystemSetting', loadTable('SystemSetting'), (item) =>
    prisma.systemSetting.upsert({
      where: { key: String(item.key) },
      update: {
        value: String(item.value),
        description: toNullableString(item.description),
      },
      create: {
        id: item.id,
        key: String(item.key),
        value: String(item.value),
        description: toNullableString(item.description),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  await insertBatch('News', loadTable('News'), (item) =>
    prisma.news.upsert({
      where: { id: item.id },
      update: {
        title: String(item.title),
        subtitle: toNullableString(item.subtitle),
        body: String(item.body),
        imageUrl: toNullableString(item.imageUrl),
        publishedAt: toDate(item.publishedAt),
        active: toBool(item.active, true),
      },
      create: {
        id: item.id,
        title: String(item.title),
        subtitle: toNullableString(item.subtitle),
        body: String(item.body),
        imageUrl: toNullableString(item.imageUrl),
        publishedAt: toDate(item.publishedAt),
        active: toBool(item.active, true),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  await insertBatch('LibraryIntegration', loadTable('LibraryIntegration'), (item) =>
    prisma.libraryIntegration.upsert({
      where: { id: item.id },
      update: {
        endpointUrl: String(item.endpointUrl),
        apiKey: toNullableString(item.apiKey),
        isConnected: toBool(item.isConnected, false),
        lastSyncAt: toNullableDate(item.lastSyncAt),
        syncStatus: String(item.syncStatus || 'NOT_CONNECTED'),
        syncError: toNullableString(item.syncError),
        autoSync: toBool(item.autoSync, false),
      },
      create: {
        id: item.id,
        endpointUrl: String(item.endpointUrl),
        apiKey: toNullableString(item.apiKey),
        isConnected: toBool(item.isConnected, false),
        lastSyncAt: toNullableDate(item.lastSyncAt),
        syncStatus: String(item.syncStatus || 'NOT_CONNECTED'),
        syncError: toNullableString(item.syncError),
        autoSync: toBool(item.autoSync, false),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  await insertBatch('User', loadTable('User'), (item) =>
    prisma.user.upsert({
      where: { id: item.id },
      update: {
        email: String(item.email),
        name: String(item.name),
        passwordHash: String(item.passwordHash),
        role: String(item.role),
        mustChangePassword: toBool(item.mustChangePassword, false),
        status: String(item.status || 'ACTIVE'),
      },
      create: {
        id: item.id,
        email: String(item.email),
        name: String(item.name),
        passwordHash: String(item.passwordHash),
        role: String(item.role),
        mustChangePassword: toBool(item.mustChangePassword, false),
        status: String(item.status || 'ACTIVE'),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  // 2. User Sessions
  await insertBatch('Session', loadTable('Session'), (item) =>
    prisma.session.upsert({
      where: { id: item.id },
      update: {
        token: String(item.token),
        expiresAt: new Date(item.expiresAt),
        ipAddress: toNullableString(item.ipAddress),
        userAgent: toNullableString(item.userAgent),
      },
      create: {
        id: item.id,
        userId: String(item.userId),
        token: String(item.token),
        expiresAt: new Date(item.expiresAt),
        ipAddress: toNullableString(item.ipAddress),
        userAgent: toNullableString(item.userAgent),
        createdAt: toDate(item.createdAt),
      },
    })
  );

  // 3. Subcategories & Category Weights
  await insertBatch('Subcategory', loadTable('Subcategory'), (item) =>
    prisma.subcategory.upsert({
      where: { id: item.id },
      update: {
        categoryId: String(item.categoryId),
        name: String(item.name),
        code: String(item.code),
        logoUrl: toNullableString(item.logoUrl),
        hasLevels: toBool(item.hasLevels, false),
        levelGroup: toNullableString(item.levelGroup),
        allowedLevelIds: toNullableString(item.allowedLevelIds),
        hasMaxScore: toBool(item.hasMaxScore, true),
        maxScore: toFloat(item.maxScore, 100.0),
        weight: toFloat(item.weight, 1.0),
        displayOrder: toInt(item.displayOrder, 0),
        active: toBool(item.active, true),
      },
      create: {
        id: item.id,
        categoryId: String(item.categoryId),
        name: String(item.name),
        code: String(item.code),
        logoUrl: toNullableString(item.logoUrl),
        hasLevels: toBool(item.hasLevels, false),
        levelGroup: toNullableString(item.levelGroup),
        allowedLevelIds: toNullableString(item.allowedLevelIds),
        hasMaxScore: toBool(item.hasMaxScore, true),
        maxScore: toFloat(item.maxScore, 100.0),
        weight: toFloat(item.weight, 1.0),
        displayOrder: toInt(item.displayOrder, 0),
        active: toBool(item.active, true),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  await insertBatch('CategoryWeight', loadTable('CategoryWeight'), (item) =>
    prisma.categoryWeight.upsert({
      where: { id: item.id },
      update: {
        categoryId: String(item.categoryId),
        academicYearId: toNullableString(item.academicYearId),
        weight: toFloat(item.weight, 10.0),
        isActive: toBool(item.isActive, true),
        isIncludedInSPR: toBool(item.isIncludedInSPR, true),
      },
      create: {
        id: item.id,
        categoryId: String(item.categoryId),
        academicYearId: toNullableString(item.academicYearId),
        weight: toFloat(item.weight, 10.0),
        isActive: toBool(item.isActive, true),
        isIncludedInSPR: toBool(item.isIncludedInSPR, true),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  // 4. Terms, Subjects, Programs, Literary Events
  await insertBatch('Term', loadTable('Term'), (item) =>
    prisma.term.upsert({
      where: { id: item.id },
      update: {
        name: String(item.name),
        code: String(item.code),
        academicYearId: String(item.academicYearId),
        isCurrent: toBool(item.isCurrent, false),
      },
      create: {
        id: item.id,
        name: String(item.name),
        code: String(item.code),
        academicYearId: String(item.academicYearId),
        isCurrent: toBool(item.isCurrent, false),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  await insertBatch('Subject', loadTable('Subject'), (item) =>
    prisma.subject.upsert({
      where: { id: item.id },
      update: {
        name: String(item.name),
        code: String(item.code),
        categoryId: String(item.categoryId),
        institutionId: toNullableString(item.institutionId),
        boardId: toNullableString(item.boardId),
        maxScore: toFloat(item.maxScore, 100.0),
      },
      create: {
        id: item.id,
        name: String(item.name),
        code: String(item.code),
        categoryId: String(item.categoryId),
        institutionId: toNullableString(item.institutionId),
        boardId: toNullableString(item.boardId),
        maxScore: toFloat(item.maxScore, 100.0),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  await insertBatch('Program', loadTable('Program'), (item) =>
    prisma.program.upsert({
      where: { id: item.id },
      update: {
        name: String(item.name),
        organizer: toNullableString(item.organizer),
        academicYearId: String(item.academicYearId),
        levelId: toNullableString(item.levelId),
        date: toDate(item.date) || new Date(),
      },
      create: {
        id: item.id,
        name: String(item.name),
        organizer: toNullableString(item.organizer),
        academicYearId: String(item.academicYearId),
        levelId: toNullableString(item.levelId),
        date: toDate(item.date) || new Date(),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  await insertBatch('LiteraryEvent', loadTable('LiteraryEvent'), (item) =>
    prisma.literaryEvent.upsert({
      where: { id: item.id },
      update: {
        name: String(item.name),
        code: String(item.code),
        academicYearId: String(item.academicYearId),
        date: toDate(item.date) || new Date(),
      },
      create: {
        id: item.id,
        name: String(item.name),
        code: String(item.code),
        academicYearId: String(item.academicYearId),
        date: toDate(item.date) || new Date(),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  // 5. Students (all 115 from CSV)
  await insertBatch('Student', loadTable('Student'), (item) =>
    prisma.student.upsert({
      where: { id: item.id },
      update: {
        studentId: String(item.studentId),
        sprStudentId: toNullableString(item.sprStudentId),
        fullName: String(item.fullName),
        classId: String(item.classId),
        schoolId: String(item.schoolId),
        division: String(item.division || 'A'),
        academicYearId: String(item.academicYearId),
        status: String(item.status || 'ACTIVE'),
        photoUrl: toNullableString(item.photoUrl),
        notes: toNullableString(item.notes),
      },
      create: {
        id: item.id,
        studentId: String(item.studentId),
        sprStudentId: toNullableString(item.sprStudentId),
        fullName: String(item.fullName),
        classId: String(item.classId),
        schoolId: String(item.schoolId),
        division: String(item.division || 'A'),
        academicYearId: String(item.academicYearId),
        status: String(item.status || 'ACTIVE'),
        photoUrl: toNullableString(item.photoUrl),
        notes: toNullableString(item.notes),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  // 6. Exams, Competitions, Literary Competitions
  await insertBatch('Exam', loadTable('Exam'), (item) =>
    prisma.exam.upsert({
      where: { id: item.id },
      update: {
        name: String(item.name),
        categoryId: String(item.categoryId),
        termId: String(item.termId),
        academicYearId: String(item.academicYearId),
        maxScore: toFloat(item.maxScore, 100.0),
        targetScore: toFloat(item.targetScore, 100.0),
      },
      create: {
        id: item.id,
        name: String(item.name),
        categoryId: String(item.categoryId),
        termId: String(item.termId),
        academicYearId: String(item.academicYearId),
        maxScore: toFloat(item.maxScore, 100.0),
        targetScore: toFloat(item.targetScore, 100.0),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  await insertBatch('Competition', loadTable('Competition'), (item) =>
    prisma.competition.upsert({
      where: { id: item.id },
      update: {
        programId: String(item.programId),
        name: String(item.name),
        maxScore: toFloat(item.maxScore, 100.0),
        date: toDate(item.date) || new Date(),
      },
      create: {
        id: item.id,
        programId: String(item.programId),
        name: String(item.name),
        maxScore: toFloat(item.maxScore, 100.0),
        date: toDate(item.date) || new Date(),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  await insertBatch('LiteraryCompetition', loadTable('LiteraryCompetition'), (item) =>
    prisma.literaryCompetition.upsert({
      where: { id: item.id },
      update: {
        eventId: String(item.eventId),
        name: String(item.name),
        levelId: toNullableString(item.levelId),
        maxScore: toFloat(item.maxScore, 100.0),
        date: toDate(item.date) || new Date(),
      },
      create: {
        id: item.id,
        eventId: String(item.eventId),
        name: String(item.name),
        levelId: toNullableString(item.levelId),
        maxScore: toFloat(item.maxScore, 100.0),
        date: toDate(item.date) || new Date(),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  // 7. Submissions, Library Records, Reports, Audit Logs, Imports
  await insertBatch('CreativeHubSubmission', loadTable('CreativeHubSubmission'), (item) =>
    prisma.creativeHubSubmission.upsert({
      where: { id: item.id },
      update: {
        studentId: String(item.studentId),
        categoryId: String(item.categoryId),
        publishedMediaId: toNullableString(item.publishedMediaId),
        publishedMediaName: toNullableString(item.publishedMediaName),
        title: String(item.title || 'Creative Submission'),
        content: toNullableString(item.content),
        date: toDate(item.date) || new Date(),
        score: toFloat(item.score, 0.0),
        maxScore: toFloat(item.maxScore, 100.0),
        percentage: toFloat(item.percentage, 0.0),
        reviewer: toNullableString(item.reviewer),
        remarks: toNullableString(item.remarks),
        publicationStatus: String(item.publicationStatus || 'PUBLISHED'),
        publicationLink: toNullableString(item.publicationLink),
        attachmentUrl: toNullableString(item.attachmentUrl),
      },
      create: {
        id: item.id,
        studentId: String(item.studentId),
        categoryId: String(item.categoryId),
        publishedMediaId: toNullableString(item.publishedMediaId),
        publishedMediaName: toNullableString(item.publishedMediaName),
        title: String(item.title || 'Creative Submission'),
        content: toNullableString(item.content),
        date: toDate(item.date) || new Date(),
        score: toFloat(item.score, 0.0),
        maxScore: toFloat(item.maxScore, 100.0),
        percentage: toFloat(item.percentage, 0.0),
        reviewer: toNullableString(item.reviewer),
        remarks: toNullableString(item.remarks),
        publicationStatus: String(item.publicationStatus || 'PUBLISHED'),
        publicationLink: toNullableString(item.publicationLink),
        attachmentUrl: toNullableString(item.attachmentUrl),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  await insertBatch('LibraryRecord', loadTable('LibraryRecord'), (item) =>
    prisma.libraryRecord.upsert({
      where: { id: item.id },
      update: {
        studentId: String(item.studentId),
        booksRead: toInt(item.booksRead, 0),
        readingScore: toFloat(item.readingScore, 0.0),
        readingRank: toNullableInt(item.readingRank),
        readingPeriod: toNullableString(item.readingPeriod),
        syncBatchId: toNullableString(item.syncBatchId),
      },
      create: {
        id: item.id,
        studentId: String(item.studentId),
        booksRead: toInt(item.booksRead, 0),
        readingScore: toFloat(item.readingScore, 0.0),
        readingRank: toNullableInt(item.readingRank),
        readingPeriod: toNullableString(item.readingPeriod),
        syncBatchId: toNullableString(item.syncBatchId),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  await insertBatch('AuditLog', loadTable('AuditLog'), (item) =>
    prisma.auditLog.upsert({
      where: { id: item.id },
      update: {
        userId: toNullableString(item.userId),
        userName: toNullableString(item.userName),
        action: String(item.action),
        entity: String(item.entity),
        entityId: toNullableString(item.entityId),
        previousValue: toNullableString(item.previousValue),
        newValue: toNullableString(item.newValue),
        ipAddress: toNullableString(item.ipAddress),
        userAgent: toNullableString(item.userAgent),
      },
      create: {
        id: item.id,
        userId: toNullableString(item.userId),
        userName: toNullableString(item.userName),
        action: String(item.action),
        entity: String(item.entity),
        entityId: toNullableString(item.entityId),
        previousValue: toNullableString(item.previousValue),
        newValue: toNullableString(item.newValue),
        ipAddress: toNullableString(item.ipAddress),
        userAgent: toNullableString(item.userAgent),
        createdAt: toDate(item.createdAt),
      },
    })
  );

  await insertBatch('ImportHistory', loadTable('ImportHistory'), (item) =>
    prisma.importHistory.upsert({
      where: { id: item.id },
      update: {
        fileName: String(item.fileName),
        fileType: String(item.fileType || 'EXCEL'),
        recordsCount: toInt(item.recordsCount, 0),
        successCount: toInt(item.successCount, 0),
        errorCount: toInt(item.errorCount, 0),
        errorsJson: toNullableString(item.errorsJson),
        uploadedById: toNullableString(item.uploadedById),
      },
      create: {
        id: item.id,
        fileName: String(item.fileName),
        fileType: String(item.fileType || 'EXCEL'),
        recordsCount: toInt(item.recordsCount, 0),
        successCount: toInt(item.successCount, 0),
        errorCount: toInt(item.errorCount, 0),
        errorsJson: toNullableString(item.errorsJson),
        uploadedById: toNullableString(item.uploadedById),
        createdAt: toDate(item.createdAt),
      },
    })
  );

  // 8. Performance Records (All 1024 records from CSV)
  await insertBatch('PerformanceRecord', loadTable('PerformanceRecord'), (item) =>
    prisma.performanceRecord.upsert({
      where: { id: item.id },
      update: {
        studentId: String(item.studentId),
        categoryId: String(item.categoryId),
        subcategoryId: toNullableString(item.subcategoryId),
        eventId: toNullableString(item.eventId),
        examId: toNullableString(item.examId),
        subjectId: toNullableString(item.subjectId),
        competitionId: toNullableString(item.competitionId),
        literaryCompetitionId: toNullableString(item.literaryCompetitionId),
        levelId: toNullableString(item.levelId),
        termId: toNullableString(item.termId),
        academicYearId: toNullableString(item.academicYearId),
        obtainedScore: toFloat(item.obtainedScore, 0.0),
        maxScore: toFloat(item.maxScore, 100.0),
        percentage: toFloat(item.percentage, 0.0),
        position: toNullableString(item.position),
        grade: toNullableString(item.grade),
        date: toDate(item.date) || new Date(),
        remarks: toNullableString(item.remarks),
        createdById: toNullableString(item.createdById),
        updatedById: toNullableString(item.updatedById),
      },
      create: {
        id: item.id,
        studentId: String(item.studentId),
        categoryId: String(item.categoryId),
        subcategoryId: toNullableString(item.subcategoryId),
        eventId: toNullableString(item.eventId),
        examId: toNullableString(item.examId),
        subjectId: toNullableString(item.subjectId),
        competitionId: toNullableString(item.competitionId),
        literaryCompetitionId: toNullableString(item.literaryCompetitionId),
        levelId: toNullableString(item.levelId),
        termId: toNullableString(item.termId),
        academicYearId: toNullableString(item.academicYearId),
        obtainedScore: toFloat(item.obtainedScore, 0.0),
        maxScore: toFloat(item.maxScore, 100.0),
        percentage: toFloat(item.percentage, 0.0),
        position: toNullableString(item.position),
        grade: toNullableString(item.grade),
        date: toDate(item.date) || new Date(),
        remarks: toNullableString(item.remarks),
        createdById: toNullableString(item.createdById),
        updatedById: toNullableString(item.updatedById),
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
      },
    })
  );

  console.log('\n====================================================');
  console.log('   STEP 2: PHOTO MIGRATION TO NEW SUPABASE STORAGE   ');
  console.log('====================================================');

  const photoBackupFile = path.join(
    process.cwd(),
    'backups',
    'student_photos_backup_2026-09-13T12-52-44-667Z.json'
  );

  let photosMigrated = 0;
  let photosFailed = 0;

  if (fs.existsSync(photoBackupFile)) {
    console.log(`Found student photos backup: ${photoBackupFile}`);
    const backupContent = JSON.parse(fs.readFileSync(photoBackupFile, 'utf-8'));
    const photoStudents = backupContent.students.filter((s: any) => s.photoUrl && s.photoUrl.startsWith('data:image/'));

    console.log(`Migrating ${photoStudents.length} student photos to new Supabase storage bucket...`);

    for (const st of photoStudents) {
      try {
        const tokenizedPath = generateTokenizedPhotoPath('webp');
        const uploadResult = await uploadBase64StudentPhoto(st.photoUrl, {
          customPath: tokenizedPath,
        });

        if (uploadResult && uploadResult.url) {
          await prisma.student.updateMany({
            where: { id: st.id },
            data: { photoUrl: uploadResult.url },
          });
          photosMigrated++;
          console.log(`✓ Photo uploaded for: ${st.fullName} (${st.studentId || st.sprStudentId})`);
        }
      } catch (uploadErr: any) {
        console.error(`✗ Photo upload failed for ${st.fullName}:`, uploadErr.message);
        photosFailed++;
      }
    }
  } else {
    console.warn(`! Photo backup file not found at ${photoBackupFile}. Skipping photo re-upload.`);
  }

  console.log('\n====================================================');
  console.log('                MIGRATION SUMMARY                    ');
  console.log('====================================================');
  console.table(
    Object.entries(stats).map(([k, v]) => ({
      Model: k,
      Total: v.total,
      Inserted: v.inserted,
      Failed: v.skipped,
    }))
  );
  console.log(`- Photos Migrated: ${photosMigrated}`);
  console.log(`- Photos Failed:   ${photosFailed}`);

  return { stats, photosMigrated, photosFailed };
}

if (require.main === module) {
  executeCsvMigration()
    .catch((err) => {
      console.error('[Migration Execution Failed]', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
