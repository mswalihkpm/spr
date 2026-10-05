import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { uploadBase64StudentPhoto, isSupabaseStorageUrl } from '../lib/supabase-storage';
import { fastParseCSV } from './fast_csv_parser';

// Ensure .env is loaded
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
      url: process.env.DATABASE_URL,
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

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delayMs = 150): Promise<T> {
  let lastErr: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastErr;
}

export async function loadSourceData(): Promise<Record<string, any[]>> {
  const backupsDir = path.join(process.cwd(), 'backups');
  const csvDir = path.join(backupsDir, 'csv');

  if (fs.existsSync(csvDir)) {
    console.log(`[Source] Loading data from CSV files at ${csvDir}...`);
    const files = fs.readdirSync(csvDir).filter((f) => f.endsWith('.csv'));
    const data: Record<string, any[]> = {};

    for (const file of files) {
      const modelName = file.replace('.csv', '');
      const filePath = path.join(csvDir, file);
      try {
        const text = fs.readFileSync(filePath, 'utf-8');
        const rows = fastParseCSV(text);
        data[modelName] = rows;
        console.log(`- Loaded ${modelName}.csv: ${rows.length} records`);
      } catch (err: any) {
        console.error(`  [Error reading ${file}]:`, err.message);
      }
    }
    return data;
  }

  throw new Error('No CSV directory found in backups/csv.');
}

export async function runFullDatabaseMigration() {
  const startTime = Date.now();
  console.log('===========================================================');
  console.log('     FULL RELATIONAL DATABASE MIGRATION (SPRENGINE)        ');
  console.log('===========================================================');

  const data = await loadSourceData();
  const stats: Record<string, { total: number; inserted: number; skipped: number }> = {};

  // Level 0: Taxonomies & Independent Records
  console.log('\n--- PHASE 1: Master Tables & Root Taxonomy ---');

  // School
  const schools = (data.School || []).map((item) => ({
    id: item.id,
    name: String(item.name),
    code: String(item.code),
    active: toBool(item.active, true),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resSchool = await withRetry(() => prisma.school.createMany({ data: schools, skipDuplicates: true }));
  stats['School'] = { total: schools.length, inserted: resSchool.count, skipped: schools.length - resSchool.count };
  console.log(`✓ School: ${schools.length}/${schools.length} synced (${resSchool.count} newly inserted)`);

  // Academic Institutions & Boards
  await withRetry(() =>
    prisma.academicInstitution.createMany({
      data: [
        { id: 'cmtop8rtw000t4d8sge5o1lao', name: "Ma'din Academy", code: 'MADIN_ACADEMY', active: true },
        { id: 'cmtop8s24000u4d8sttpo4kt5', name: 'Jamiathul Hind Al-Islamiyya', code: 'JAMIATHUL_HIND', active: true },
      ],
      skipDuplicates: true,
    })
  );
  await withRetry(() =>
    prisma.boardSyllabus.createMany({
      data: [
        { id: 'cmtop8saa000v4d8sqtlxwy1j', name: 'Kerala State Syllabus', code: 'KERALA_STATE', active: true },
        { id: 'cmtop8sik000w4d8sdqeb7nh0', name: 'NCERT / CBSE', code: 'NCERT', active: true },
      ],
      skipDuplicates: true,
    })
  );

  // AcademicClass
  const classes = (data.AcademicClass || []).map((item) => ({
    id: item.id,
    name: String(item.name),
    numericGrade: toInt(item.numericGrade, 0),
    active: toBool(item.active, true),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resClass = await withRetry(() => prisma.academicClass.createMany({ data: classes, skipDuplicates: true }));
  stats['AcademicClass'] = { total: classes.length, inserted: resClass.count, skipped: classes.length - resClass.count };
  console.log(`✓ AcademicClass: ${classes.length}/${classes.length} synced (${resClass.count} newly inserted)`);

  // AcademicYear
  const years = (data.AcademicYear || []).map((item) => ({
    id: item.id,
    name: String(item.name),
    isCurrent: toBool(item.isCurrent, false),
    startDate: toNullableDate(item.startDate),
    endDate: toNullableDate(item.endDate),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resYear = await withRetry(() => prisma.academicYear.createMany({ data: years, skipDuplicates: true }));
  stats['AcademicYear'] = { total: years.length, inserted: resYear.count, skipped: years.length - resYear.count };
  console.log(`✓ AcademicYear: ${years.length}/${years.length} synced (${resYear.count} newly inserted)`);

  // Level
  const levels = (data.Level || []).map((item) => ({
    id: item.id,
    name: String(item.name),
    code: String(item.code),
    weightMultiplier: toFloat(item.weightMultiplier, 1.0),
    displayOrder: toInt(item.displayOrder, 0),
    active: toBool(item.active, true),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resLevel = await withRetry(() => prisma.level.createMany({ data: levels, skipDuplicates: true }));
  stats['Level'] = { total: levels.length, inserted: resLevel.count, skipped: levels.length - resLevel.count };
  console.log(`✓ Level: ${levels.length}/${levels.length} synced (${resLevel.count} newly inserted)`);

  // Category
  const categories = (data.Category || []).map((item) => ({
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
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resCategory = await withRetry(() => prisma.category.createMany({ data: categories, skipDuplicates: true }));
  stats['Category'] = { total: categories.length, inserted: resCategory.count, skipped: categories.length - resCategory.count };
  console.log(`✓ Category: ${categories.length}/${categories.length} synced (${resCategory.count} newly inserted)`);

  // CreativeHubCategory
  const creativeCats = (data.CreativeHubCategory || []).map((item) => ({
    id: item.id,
    name: String(item.name),
    code: String(item.code),
    weight: toFloat(item.weight, 1.0),
    displayOrder: toInt(item.displayOrder, 0),
    active: toBool(item.active, true),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resCreativeCat = await withRetry(() => prisma.creativeHubCategory.createMany({ data: creativeCats, skipDuplicates: true }));
  stats['CreativeHubCategory'] = { total: creativeCats.length, inserted: resCreativeCat.count, skipped: creativeCats.length - resCreativeCat.count };
  console.log(`✓ CreativeHubCategory: ${creativeCats.length}/${creativeCats.length} synced (${resCreativeCat.count} newly inserted)`);

  // PublishedMedia
  const publishedMedia = (data.PublishedMedia || []).map((item) => ({
    id: item.id,
    name: String(item.name),
    code: toNullableString(item.code),
    weight: toFloat(item.weight, 1.0),
    active: toBool(item.active, true),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resPubMedia = await withRetry(() => prisma.publishedMedia.createMany({ data: publishedMedia, skipDuplicates: true }));
  stats['PublishedMedia'] = { total: publishedMedia.length, inserted: resPubMedia.count, skipped: publishedMedia.length - resPubMedia.count };
  console.log(`✓ PublishedMedia: ${publishedMedia.length}/${publishedMedia.length} synced (${resPubMedia.count} newly inserted)`);

  // SystemSetting
  const settings = (data.SystemSetting || []).map((item) => ({
    id: item.id,
    key: String(item.key),
    value: String(item.value),
    description: toNullableString(item.description),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resSettings = await withRetry(() => prisma.systemSetting.createMany({ data: settings, skipDuplicates: true }));
  stats['SystemSetting'] = { total: settings.length, inserted: resSettings.count, skipped: settings.length - resSettings.count };
  console.log(`✓ SystemSetting: ${settings.length}/${settings.length} synced (${resSettings.count} newly inserted)`);

  // News
  const news = (data.News || []).map((item) => ({
    id: item.id,
    title: String(item.title),
    subtitle: toNullableString(item.subtitle),
    body: String(item.body),
    imageUrl: toNullableString(item.imageUrl),
    publishedAt: toDate(item.publishedAt) || new Date(),
    active: toBool(item.active, true),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resNews = await withRetry(() => prisma.news.createMany({ data: news, skipDuplicates: true }));
  stats['News'] = { total: news.length, inserted: resNews.count, skipped: news.length - resNews.count };
  console.log(`✓ News: ${news.length}/${news.length} synced (${resNews.count} newly inserted)`);

  // LibraryIntegration
  const libIntegrations = (data.LibraryIntegration || []).map((item) => ({
    id: item.id,
    endpointUrl: String(item.endpointUrl || 'https://msoelibrary.vercel.app/'),
    apiKey: toNullableString(item.apiKey),
    isConnected: toBool(item.isConnected, false),
    lastSyncAt: toNullableDate(item.lastSyncAt),
    syncStatus: String(item.syncStatus || 'NOT_CONNECTED'),
    syncError: toNullableString(item.syncError),
    autoSync: toBool(item.autoSync, false),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resLibInt = await withRetry(() => prisma.libraryIntegration.createMany({ data: libIntegrations, skipDuplicates: true }));
  stats['LibraryIntegration'] = { total: libIntegrations.length, inserted: resLibInt.count, skipped: libIntegrations.length - resLibInt.count };
  console.log(`✓ LibraryIntegration: ${libIntegrations.length}/${libIntegrations.length} synced (${resLibInt.count} newly inserted)`);

  // Level 1: Users & Sessions
  console.log('\n--- PHASE 2: Users & Authentication ---');

  const users = (data.User || []).map((item) => ({
    id: item.id,
    email: String(item.email),
    name: String(item.name),
    passwordHash: String(item.passwordHash),
    role: String(item.role || 'ADMIN'),
    mustChangePassword: toBool(item.mustChangePassword, false),
    status: String(item.status || 'ACTIVE'),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resUser = await withRetry(() => prisma.user.createMany({ data: users, skipDuplicates: true }));
  stats['User'] = { total: users.length, inserted: resUser.count, skipped: users.length - resUser.count };
  console.log(`✓ User: ${users.length}/${users.length} synced (${resUser.count} newly inserted)`);

  const sessions = (data.Session || []).map((item) => ({
    id: item.id,
    userId: item.userId,
    token: item.token,
    expiresAt: toDate(item.expiresAt) || new Date(Date.now() + 86400000),
    ipAddress: toNullableString(item.ipAddress),
    userAgent: toNullableString(item.userAgent),
    createdAt: toDate(item.createdAt) || new Date(),
  }));
  const resSession = await withRetry(() => prisma.session.createMany({ data: sessions, skipDuplicates: true }));
  stats['Session'] = { total: sessions.length, inserted: resSession.count, skipped: sessions.length - resSession.count };
  console.log(`✓ Session: ${sessions.length}/${sessions.length} synced (${resSession.count} newly inserted)`);

  // Level 2: Dependent Taxonomies
  console.log('\n--- PHASE 3: Dependent Categories & Academic Setup ---');

  const subcategories = (data.Subcategory || []).map((item) => ({
    id: item.id,
    categoryId: item.categoryId,
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
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resSubcategory = await withRetry(() => prisma.subcategory.createMany({ data: subcategories, skipDuplicates: true }));
  stats['Subcategory'] = { total: subcategories.length, inserted: resSubcategory.count, skipped: subcategories.length - resSubcategory.count };
  console.log(`✓ Subcategory: ${subcategories.length}/${subcategories.length} synced (${resSubcategory.count} newly inserted)`);

  const categoryWeights = (data.CategoryWeight || []).map((item) => ({
    id: item.id,
    categoryId: item.categoryId,
    academicYearId: toNullableString(item.academicYearId),
    weight: toFloat(item.weight, 10.0),
    isActive: toBool(item.isActive, true),
    isIncludedInSPR: toBool(item.isIncludedInSPR, true),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resCatWeight = await withRetry(() => prisma.categoryWeight.createMany({ data: categoryWeights, skipDuplicates: true }));
  stats['CategoryWeight'] = { total: categoryWeights.length, inserted: resCatWeight.count, skipped: categoryWeights.length - resCatWeight.count };
  console.log(`✓ CategoryWeight: ${categoryWeights.length}/${categoryWeights.length} synced (${resCatWeight.count} newly inserted)`);

  const terms = (data.Term || []).map((item) => ({
    id: item.id,
    name: String(item.name),
    code: String(item.code),
    academicYearId: item.academicYearId,
    isCurrent: toBool(item.isCurrent, false),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resTerm = await withRetry(() => prisma.term.createMany({ data: terms, skipDuplicates: true }));
  stats['Term'] = { total: terms.length, inserted: resTerm.count, skipped: terms.length - resTerm.count };
  console.log(`✓ Term: ${terms.length}/${terms.length} synced (${resTerm.count} newly inserted)`);

  const subjects = (data.Subject || []).map((item) => ({
    id: item.id,
    name: String(item.name),
    code: String(item.code),
    categoryId: item.categoryId,
    institutionId: toNullableString(item.institutionId) || 'cmtop8rtw000t4d8sge5o1lao',
    boardId: toNullableString(item.boardId) || 'cmtop8saa000v4d8sqtlxwy1j',
    maxScore: toFloat(item.maxScore, 100.0),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resSubject = await withRetry(() => prisma.subject.createMany({ data: subjects, skipDuplicates: true }));
  stats['Subject'] = { total: subjects.length, inserted: resSubject.count, skipped: subjects.length - resSubject.count };
  console.log(`✓ Subject: ${subjects.length}/${subjects.length} synced (${resSubject.count} newly inserted)`);

  const programs = (data.Program || []).map((item) => ({
    id: item.id,
    name: String(item.name),
    organizer: toNullableString(item.organizer),
    academicYearId: item.academicYearId,
    levelId: toNullableString(item.levelId),
    date: toDate(item.date) || new Date(),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resProg = await withRetry(() => prisma.program.createMany({ data: programs, skipDuplicates: true }));
  stats['Program'] = { total: programs.length, inserted: resProg.count, skipped: programs.length - resProg.count };
  console.log(`✓ Program: ${programs.length}/${programs.length} synced (${resProg.count} newly inserted)`);

  const literaryEvents = (data.LiteraryEvent || []).map((item) => ({
    id: item.id,
    name: String(item.name),
    code: String(item.code),
    academicYearId: item.academicYearId,
    date: toDate(item.date) || new Date(),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resLitEvent = await withRetry(() => prisma.literaryEvent.createMany({ data: literaryEvents, skipDuplicates: true }));
  stats['LiteraryEvent'] = { total: literaryEvents.length, inserted: resLitEvent.count, skipped: literaryEvents.length - resLitEvent.count };
  console.log(`✓ LiteraryEvent: ${literaryEvents.length}/${literaryEvents.length} synced (${resLitEvent.count} newly inserted)`);

  // Level 3: Students Master
  console.log('\n--- PHASE 4: Students Master ---');

  const existingStudents = await withRetry(() =>
    prisma.student.findMany({
      select: { id: true, photoUrl: true },
    })
  );
  const photoUrlMap = new Map<string, string | null>();
  existingStudents.forEach((s) => photoUrlMap.set(s.id, s.photoUrl));

  const students = (data.Student || []).map((item) => {
    let photoUrl = photoUrlMap.get(item.id) || null;
    if (!photoUrl && item.photoUrl && !item.photoUrl.startsWith('data:image/')) {
      photoUrl = toNullableString(item.photoUrl);
    }
    return {
      id: item.id,
      studentId: String(item.studentId),
      sprStudentId: toNullableString(item.sprStudentId),
      fullName: String(item.fullName),
      classId: item.classId,
      schoolId: item.schoolId,
      division: String(item.division || 'A'),
      academicYearId: item.academicYearId,
      status: String(item.status || 'ACTIVE'),
      photoUrl,
      notes: toNullableString(item.notes),
      createdAt: toDate(item.createdAt) || new Date(),
      updatedAt: toDate(item.updatedAt) || new Date(),
    };
  });
  const resStudent = await withRetry(() => prisma.student.createMany({ data: students, skipDuplicates: true }));
  stats['Student'] = { total: students.length, inserted: resStudent.count, skipped: students.length - resStudent.count };
  console.log(`✓ Student: ${students.length}/${students.length} synced (${resStudent.count} newly inserted)`);

  // Level 4: Events, Competitions & Exams
  console.log('\n--- PHASE 5: Competitions & Exams ---');

  const exams = (data.Exam || []).map((item) => ({
    id: item.id,
    name: String(item.name),
    categoryId: item.categoryId,
    termId: item.termId,
    academicYearId: item.academicYearId,
    maxScore: toFloat(item.maxScore, 100.0),
    targetScore: toFloat(item.targetScore, 100.0),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resExam = await withRetry(() => prisma.exam.createMany({ data: exams, skipDuplicates: true }));
  stats['Exam'] = { total: exams.length, inserted: resExam.count, skipped: exams.length - resExam.count };
  console.log(`✓ Exam: ${exams.length}/${exams.length} synced (${resExam.count} newly inserted)`);

  const competitions = (data.Competition || []).map((item) => ({
    id: item.id,
    programId: item.programId,
    name: String(item.name),
    maxScore: toFloat(item.maxScore, 100.0),
    date: toDate(item.date) || new Date(),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resComp = await withRetry(() => prisma.competition.createMany({ data: competitions, skipDuplicates: true }));
  stats['Competition'] = { total: competitions.length, inserted: resComp.count, skipped: competitions.length - resComp.count };
  console.log(`✓ Competition: ${competitions.length}/${competitions.length} synced (${resComp.count} newly inserted)`);

  const literaryCompetitions = (data.LiteraryCompetition || []).map((item) => ({
    id: item.id,
    eventId: item.eventId,
    name: String(item.name),
    levelId: toNullableString(item.levelId),
    maxScore: toFloat(item.maxScore, 100.0),
    date: toDate(item.date) || new Date(),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resLitComp = await withRetry(() => prisma.literaryCompetition.createMany({ data: literaryCompetitions, skipDuplicates: true }));
  stats['LiteraryCompetition'] = { total: literaryCompetitions.length, inserted: resLitComp.count, skipped: literaryCompetitions.length - resLitComp.count };
  console.log(`✓ LiteraryCompetition: ${literaryCompetitions.length}/${literaryCompetitions.length} synced (${resLitComp.count} newly inserted)`);

  // Level 5: Submissions & Activity Records
  console.log('\n--- PHASE 6: Submissions & Library Records ---');

  const creativeSubmissions = (data.CreativeHubSubmission || []).map((item) => ({
    id: item.id,
    studentId: item.studentId,
    categoryId: item.categoryId,
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
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resCreativeSub = await withRetry(() => prisma.creativeHubSubmission.createMany({ data: creativeSubmissions, skipDuplicates: true }));
  stats['CreativeHubSubmission'] = { total: creativeSubmissions.length, inserted: resCreativeSub.count, skipped: creativeSubmissions.length - resCreativeSub.count };
  console.log(`✓ CreativeHubSubmission: ${creativeSubmissions.length}/${creativeSubmissions.length} synced (${resCreativeSub.count} newly inserted)`);

  const libraryRecords = (data.LibraryRecord || []).map((item) => ({
    id: item.id,
    studentId: item.studentId,
    booksRead: toInt(item.booksRead, 0),
    readingScore: toFloat(item.readingScore, 0.0),
    readingRank: toNullableInt(item.readingRank),
    readingPeriod: toNullableString(item.readingPeriod),
    syncBatchId: toNullableString(item.syncBatchId),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resLibRecord = await withRetry(() => prisma.libraryRecord.createMany({ data: libraryRecords, skipDuplicates: true }));
  stats['LibraryRecord'] = { total: libraryRecords.length, inserted: resLibRecord.count, skipped: libraryRecords.length - resLibRecord.count };
  console.log(`✓ LibraryRecord: ${libraryRecords.length}/${libraryRecords.length} synced (${resLibRecord.count} newly inserted)`);

  const auditLogs = (data.AuditLog || []).map((item) => ({
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
    createdAt: toDate(item.createdAt) || new Date(),
  }));
  const resAudit = await withRetry(() => prisma.auditLog.createMany({ data: auditLogs, skipDuplicates: true }));
  stats['AuditLog'] = { total: auditLogs.length, inserted: resAudit.count, skipped: auditLogs.length - resAudit.count };
  console.log(`✓ AuditLog: ${auditLogs.length}/${auditLogs.length} synced (${resAudit.count} newly inserted)`);

  const importHistories = (data.ImportHistory || []).map((item) => ({
    id: item.id,
    fileName: String(item.fileName),
    fileType: String(item.fileType || 'EXCEL'),
    recordsCount: toInt(item.recordsCount, 0),
    successCount: toInt(item.successCount, 0),
    errorCount: toInt(item.errorCount, 0),
    errorsJson: toNullableString(item.errorsJson),
    uploadedById: toNullableString(item.uploadedById),
    createdAt: toDate(item.createdAt) || new Date(),
  }));
  const resImport = await withRetry(() => prisma.importHistory.createMany({ data: importHistories, skipDuplicates: true }));
  stats['ImportHistory'] = { total: importHistories.length, inserted: resImport.count, skipped: importHistories.length - resImport.count };
  console.log(`✓ ImportHistory: ${importHistories.length}/${importHistories.length} synced (${resImport.count} newly inserted)`);

  // Level 6: Performance Records (All Marks & Scores)
  console.log('\n--- PHASE 7: Performance Records (All Marks & Scores) ---');

  const performanceRecords = (data.PerformanceRecord || []).map((item) => ({
    id: item.id,
    studentId: item.studentId,
    categoryId: item.categoryId,
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
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resPerf = await withRetry(() => prisma.performanceRecord.createMany({ data: performanceRecords, skipDuplicates: true }));
  stats['PerformanceRecord'] = { total: performanceRecords.length, inserted: resPerf.count, skipped: performanceRecords.length - resPerf.count };
  console.log(`✓ PerformanceRecord: ${performanceRecords.length}/${performanceRecords.length} synced (${resPerf.count} newly inserted)`);

  // Phase 8: Photo Migration
  console.log('\n===========================================================');
  console.log('       PHASE 8: STUDENT AVATAR PHOTO MIGRATION             ');
  console.log('===========================================================');

  const photoBackupFile = path.join(
    process.cwd(),
    'backups',
    'student_photos_backup_2026-09-13T12-52-44-667Z.json'
  );

  let photosMigrated = 0;
  let photosSkipped = 0;
  let photosFailed = 0;

  if (fs.existsSync(photoBackupFile)) {
    console.log(`Found photo backup file: ${photoBackupFile}`);
    const backupContent = JSON.parse(fs.readFileSync(photoBackupFile, 'utf-8'));
    const photoStudents = backupContent.students.filter((s: any) => s.photoUrl && s.photoUrl.startsWith('data:image/'));
    console.log(`Auditing ${photoStudents.length} student photos for Supabase Storage...`);

    const allDbStudents = await withRetry(() =>
      prisma.student.findMany({
        select: { id: true, studentId: true, sprStudentId: true, fullName: true, photoUrl: true },
      })
    );

    for (let i = 0; i < photoStudents.length; i++) {
      const st = photoStudents[i];
      try {
        const dbStudent = allDbStudents.find(
          (s) =>
            s.id === st.id ||
            s.studentId === st.studentId ||
            (st.sprStudentId && s.sprStudentId === st.sprStudentId)
        );

        if (dbStudent && isSupabaseStorageUrl(dbStudent.photoUrl)) {
          photosSkipped++;
          continue;
        }

        const uploadResult = await uploadBase64StudentPhoto(st.photoUrl);
        if (uploadResult && uploadResult.url) {
          if (dbStudent) {
            await withRetry(() =>
              prisma.student.update({
                where: { id: dbStudent.id },
                data: { photoUrl: uploadResult.url },
              })
            );
            dbStudent.photoUrl = uploadResult.url;
          }
          photosMigrated++;
          console.log(`[${i + 1}/${photoStudents.length}] ✓ Uploaded & Linked: ${st.fullName}`);
        }
      } catch (err: any) {
        photosFailed++;
        console.error(`[${i + 1}/${photoStudents.length}] ✗ Upload failed for ${st.fullName}:`, err.message);
      }
    }
    console.log(`✓ Photo migration audit: ${photosMigrated} newly uploaded, ${photosSkipped} already in storage, ${photosFailed} failed.`);
  } else {
    console.warn(`! Photo backup file not found at ${photoBackupFile}`);
  }

  const durationMs = Date.now() - startTime;
  console.log('\n===========================================================');
  console.log(`       MIGRATION FINISHED SUCCESSFULLY IN ${(durationMs / 1000).toFixed(2)}s      `);
  console.log('===========================================================');

  const summaryRows = Object.entries(stats).map(([name, s]) => ({
    Model: name,
    Total: s.total,
    Inserted: s.inserted,
    Existing: s.skipped,
  }));
  console.table(summaryRows);

  return { stats, photosMigrated, photosSkipped, photosFailed };
}

if (require.main === module) {
  runFullDatabaseMigration()
    .catch((err) => {
      console.error('[Fatal Migration Error]', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
