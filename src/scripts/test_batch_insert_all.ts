import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fastParseCSV } from './fast_csv_parser';

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
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
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

const csvDir = path.join(process.cwd(), 'backups', 'csv');

function loadTable(tableName: string): Record<string, any>[] {
  const p = path.join(csvDir, `${tableName}.csv`);
  if (fs.existsSync(p)) {
    return fastParseCSV(fs.readFileSync(p, 'utf-8'));
  }
  return [];
}

async function runFastMigration() {
  const startTime = Date.now();
  console.log('--- Executing High-Speed Batch Migration ---');

  // Level 0: Taxonomies & Independent Records
  const schools = loadTable('School').map((item) => ({
    id: item.id,
    name: String(item.name),
    code: String(item.code),
    active: toBool(item.active, true),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resSchool = await prisma.school.createMany({ data: schools, skipDuplicates: true });
  console.log(`✓ School: ${resSchool.count}/${schools.length} created`);

  // Academic Institutions & Boards
  await prisma.academicInstitution.createMany({
    data: [
      { id: 'cmtop8rtw000t4d8sge5o1lao', name: "Ma'din Academy", code: 'MADIN_ACADEMY', active: true },
      { id: 'cmtop8s24000u4d8sttpo4kt5', name: 'Jamiathul Hind Al-Islamiyya', code: 'JAMIATHUL_HIND', active: true },
    ],
    skipDuplicates: true,
  });
  await prisma.boardSyllabus.createMany({
    data: [
      { id: 'cmtop8saa000v4d8sqtlxwy1j', name: 'Kerala State Syllabus', code: 'KERALA_STATE', active: true },
      { id: 'cmtop8sik000w4d8sdqeb7nh0', name: 'NCERT / CBSE', code: 'NCERT', active: true },
    ],
    skipDuplicates: true,
  });

  const classes = loadTable('AcademicClass').map((item) => ({
    id: item.id,
    name: String(item.name),
    numericGrade: toInt(item.numericGrade, 0),
    active: toBool(item.active, true),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resClass = await prisma.academicClass.createMany({ data: classes, skipDuplicates: true });
  console.log(`✓ AcademicClass: ${resClass.count}/${classes.length} created`);

  const years = loadTable('AcademicYear').map((item) => ({
    id: item.id,
    name: String(item.name),
    isCurrent: toBool(item.isCurrent, false),
    startDate: toNullableDate(item.startDate),
    endDate: toNullableDate(item.endDate),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resYear = await prisma.academicYear.createMany({ data: years, skipDuplicates: true });
  console.log(`✓ AcademicYear: ${resYear.count}/${years.length} created`);

  const levels = loadTable('Level').map((item) => ({
    id: item.id,
    name: String(item.name),
    code: String(item.code),
    weightMultiplier: toFloat(item.weightMultiplier, 1.0),
    displayOrder: toInt(item.displayOrder, 0),
    active: toBool(item.active, true),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resLevel = await prisma.level.createMany({ data: levels, skipDuplicates: true });
  console.log(`✓ Level: ${resLevel.count}/${levels.length} created`);

  const categories = loadTable('Category').map((item) => ({
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
  const resCategory = await prisma.category.createMany({ data: categories, skipDuplicates: true });
  console.log(`✓ Category: ${resCategory.count}/${categories.length} created`);

  const creativeCats = loadTable('CreativeHubCategory').map((item) => ({
    id: item.id,
    name: String(item.name),
    code: String(item.code),
    weight: toFloat(item.weight, 1.0),
    displayOrder: toInt(item.displayOrder, 0),
    active: toBool(item.active, true),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resCreativeCat = await prisma.creativeHubCategory.createMany({ data: creativeCats, skipDuplicates: true });
  console.log(`✓ CreativeHubCategory: ${resCreativeCat.count}/${creativeCats.length} created`);

  const publishedMedia = loadTable('PublishedMedia').map((item) => ({
    id: item.id,
    name: String(item.name),
    code: toNullableString(item.code),
    weight: toFloat(item.weight, 1.0),
    active: toBool(item.active, true),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resPubMedia = await prisma.publishedMedia.createMany({ data: publishedMedia, skipDuplicates: true });
  console.log(`✓ PublishedMedia: ${resPubMedia.count}/${publishedMedia.length} created`);

  const settings = loadTable('SystemSetting').map((item) => ({
    id: item.id,
    key: String(item.key),
    value: String(item.value),
    description: toNullableString(item.description),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resSettings = await prisma.systemSetting.createMany({ data: settings, skipDuplicates: true });
  console.log(`✓ SystemSetting: ${resSettings.count}/${settings.length} created`);

  const news = loadTable('News').map((item) => ({
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
  const resNews = await prisma.news.createMany({ data: news, skipDuplicates: true });
  console.log(`✓ News: ${resNews.count}/${news.length} created`);

  const libraryIntegrations = loadTable('LibraryIntegration').map((item) => ({
    id: item.id,
    endpointUrl: String(item.endpointUrl),
    apiKey: toNullableString(item.apiKey),
    isConnected: toBool(item.isConnected, false),
    lastSyncAt: toNullableDate(item.lastSyncAt),
    syncStatus: String(item.syncStatus || 'NOT_CONNECTED'),
    syncError: toNullableString(item.syncError),
    autoSync: toBool(item.autoSync, false),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resLibInt = await prisma.libraryIntegration.createMany({ data: libraryIntegrations, skipDuplicates: true });
  console.log(`✓ LibraryIntegration: ${resLibInt.count}/${libraryIntegrations.length} created`);

  const users = loadTable('User').map((item) => ({
    id: item.id,
    email: String(item.email),
    name: String(item.name),
    passwordHash: String(item.passwordHash),
    role: String(item.role),
    mustChangePassword: toBool(item.mustChangePassword, false),
    status: String(item.status || 'ACTIVE'),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resUser = await prisma.user.createMany({ data: users, skipDuplicates: true });
  console.log(`✓ User: ${resUser.count}/${users.length} created`);

  // Level 1: Dependent Records
  const sessions = loadTable('Session').map((item) => ({
    id: item.id,
    userId: String(item.userId),
    token: String(item.token),
    expiresAt: new Date(item.expiresAt),
    ipAddress: toNullableString(item.ipAddress),
    userAgent: toNullableString(item.userAgent),
    createdAt: toDate(item.createdAt) || new Date(),
  }));
  const resSession = await prisma.session.createMany({ data: sessions, skipDuplicates: true });
  console.log(`✓ Session: ${resSession.count}/${sessions.length} created`);

  const subcategories = loadTable('Subcategory').map((item) => ({
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
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resSubcat = await prisma.subcategory.createMany({ data: subcategories, skipDuplicates: true });
  console.log(`✓ Subcategory: ${resSubcat.count}/${subcategories.length} created`);

  const weights = loadTable('CategoryWeight').map((item) => ({
    id: item.id,
    categoryId: String(item.categoryId),
    academicYearId: toNullableString(item.academicYearId),
    weight: toFloat(item.weight, 10.0),
    isActive: toBool(item.isActive, true),
    isIncludedInSPR: toBool(item.isIncludedInSPR, true),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resWeight = await prisma.categoryWeight.createMany({ data: weights, skipDuplicates: true });
  console.log(`✓ CategoryWeight: ${resWeight.count}/${weights.length} created`);

  const terms = loadTable('Term').map((item) => ({
    id: item.id,
    name: String(item.name),
    code: String(item.code),
    academicYearId: String(item.academicYearId),
    isCurrent: toBool(item.isCurrent, false),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resTerm = await prisma.term.createMany({ data: terms, skipDuplicates: true });
  console.log(`✓ Term: ${resTerm.count}/${terms.length} created`);

  const subjects = loadTable('Subject').map((item) => ({
    id: item.id,
    name: String(item.name),
    code: String(item.code),
    categoryId: String(item.categoryId),
    institutionId: toNullableString(item.institutionId),
    boardId: toNullableString(item.boardId),
    maxScore: toFloat(item.maxScore, 100.0),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resSubject = await prisma.subject.createMany({ data: subjects, skipDuplicates: true });
  console.log(`✓ Subject: ${resSubject.count}/${subjects.length} created`);

  const programs = loadTable('Program').map((item) => ({
    id: item.id,
    name: String(item.name),
    organizer: toNullableString(item.organizer),
    academicYearId: String(item.academicYearId),
    levelId: toNullableString(item.levelId),
    date: toDate(item.date) || new Date(),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resProgram = await prisma.program.createMany({ data: programs, skipDuplicates: true });
  console.log(`✓ Program: ${resProgram.count}/${programs.length} created`);

  const litEvents = loadTable('LiteraryEvent').map((item) => ({
    id: item.id,
    name: String(item.name),
    code: String(item.code),
    academicYearId: String(item.academicYearId),
    date: toDate(item.date) || new Date(),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resLitEvent = await prisma.literaryEvent.createMany({ data: litEvents, skipDuplicates: true });
  console.log(`✓ LiteraryEvent: ${resLitEvent.count}/${litEvents.length} created`);

  // Students (all 115)
  const students = loadTable('Student').map((item) => ({
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
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resStudent = await prisma.student.createMany({ data: students, skipDuplicates: true });
  console.log(`✓ Student: ${resStudent.count}/${students.length} created`);

  // Level 2: Exams, Competitions, Submissions, LibraryRecords
  const exams = loadTable('Exam').map((item) => ({
    id: item.id,
    name: String(item.name),
    categoryId: String(item.categoryId),
    termId: String(item.termId),
    academicYearId: String(item.academicYearId),
    maxScore: toFloat(item.maxScore, 100.0),
    targetScore: toFloat(item.targetScore, 100.0),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resExam = await prisma.exam.createMany({ data: exams, skipDuplicates: true });
  console.log(`✓ Exam: ${resExam.count}/${exams.length} created`);

  const comps = loadTable('Competition').map((item) => ({
    id: item.id,
    programId: String(item.programId),
    name: String(item.name),
    maxScore: toFloat(item.maxScore, 100.0),
    date: toDate(item.date) || new Date(),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resComp = await prisma.competition.createMany({ data: comps, skipDuplicates: true });
  console.log(`✓ Competition: ${resComp.count}/${comps.length} created`);

  const litComps = loadTable('LiteraryCompetition').map((item) => ({
    id: item.id,
    eventId: String(item.eventId),
    name: String(item.name),
    levelId: toNullableString(item.levelId),
    maxScore: toFloat(item.maxScore, 100.0),
    date: toDate(item.date) || new Date(),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resLitComp = await prisma.literaryCompetition.createMany({ data: litComps, skipDuplicates: true });
  console.log(`✓ LiteraryCompetition: ${resLitComp.count}/${litComps.length} created`);

  const creativeSubs = loadTable('CreativeHubSubmission').map((item) => ({
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
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resCreativeSub = await prisma.creativeHubSubmission.createMany({ data: creativeSubs, skipDuplicates: true });
  console.log(`✓ CreativeHubSubmission: ${resCreativeSub.count}/${creativeSubs.length} created`);

  const libRecords = loadTable('LibraryRecord').map((item) => ({
    id: item.id,
    studentId: String(item.studentId),
    booksRead: toInt(item.booksRead, 0),
    readingScore: toFloat(item.readingScore, 0.0),
    readingRank: toNullableInt(item.readingRank),
    readingPeriod: toNullableString(item.readingPeriod),
    syncBatchId: toNullableString(item.syncBatchId),
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resLibRec = await prisma.libraryRecord.createMany({ data: libRecords, skipDuplicates: true });
  console.log(`✓ LibraryRecord: ${resLibRec.count}/${libRecords.length} created`);

  const audits = loadTable('AuditLog').map((item) => ({
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
  const resAudit = await prisma.auditLog.createMany({ data: audits, skipDuplicates: true });
  console.log(`✓ AuditLog: ${resAudit.count}/${audits.length} created`);

  const imports = loadTable('ImportHistory').map((item) => ({
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
  const resImport = await prisma.importHistory.createMany({ data: imports, skipDuplicates: true });
  console.log(`✓ ImportHistory: ${resImport.count}/${imports.length} created`);

  // Level 3: Performance Records (All 1024)
  const perfRecords = loadTable('PerformanceRecord').map((item) => ({
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
    createdAt: toDate(item.createdAt) || new Date(),
    updatedAt: toDate(item.updatedAt) || new Date(),
  }));
  const resPerf = await prisma.performanceRecord.createMany({ data: perfRecords, skipDuplicates: true });
  console.log(`✓ PerformanceRecord: ${resPerf.count}/${perfRecords.length} created`);

  console.log(`\nAll 27 tables inserted in ${((Date.now() - startTime) / 1000).toFixed(1)}s!`);
}

if (require.main === module) {
  runFastMigration()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
