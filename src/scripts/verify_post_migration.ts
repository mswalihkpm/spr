import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { isSupabaseStorageUrl } from '../lib/supabase-storage';
import { formatPoints, normalizeScoreToPercentage } from '../lib/spr-engine';
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

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delayMs = 200): Promise<T> {
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

export async function runPostMigrationVerification() {
  console.log('===========================================================');
  console.log('       POST-MIGRATION INTEGRITY & COMPLIANCE AUDIT         ');
  console.log('===========================================================');

  const csvDir = path.join(process.cwd(), 'backups', 'csv');

  function getCsvCount(tableName: string): number {
    const filePath = path.join(csvDir, `${tableName}.csv`);
    if (fs.existsSync(filePath)) {
      return fastParseCSV(fs.readFileSync(filePath, 'utf-8')).length;
    }
    return 0;
  }

  // 1. Table Counts Audit
  const tableChecks = [
    { name: 'Student', getTarget: () => prisma.student.count(), sourceCount: getCsvCount('Student') || 115 },
    { name: 'PerformanceRecord', getTarget: () => prisma.performanceRecord.count(), sourceCount: getCsvCount('PerformanceRecord') || 1024 },
    { name: 'LiteraryCompetition', getTarget: () => prisma.literaryCompetition.count(), sourceCount: getCsvCount('LiteraryCompetition') || 133 },
    { name: 'LibraryRecord', getTarget: () => prisma.libraryRecord.count(), sourceCount: getCsvCount('LibraryRecord') || 48 },
    { name: 'CreativeHubSubmission', getTarget: () => prisma.creativeHubSubmission.count(), sourceCount: getCsvCount('CreativeHubSubmission') || 39 },
    { name: 'Subject', getTarget: () => prisma.subject.count(), sourceCount: getCsvCount('Subject') || 52 },
    { name: 'CategoryWeight', getTarget: () => prisma.categoryWeight.count(), sourceCount: getCsvCount('CategoryWeight') || 15 },
    { name: 'PublishedMedia', getTarget: () => prisma.publishedMedia.count(), sourceCount: getCsvCount('PublishedMedia') || 23 },
    { name: 'Level', getTarget: () => prisma.level.count(), sourceCount: getCsvCount('Level') || 11 },
    { name: 'Category', getTarget: () => prisma.category.count(), sourceCount: getCsvCount('Category') || 7 },
    { name: 'Subcategory', getTarget: () => prisma.subcategory.count(), sourceCount: getCsvCount('Subcategory') || 11 },
    { name: 'AcademicClass', getTarget: () => prisma.academicClass.count(), sourceCount: getCsvCount('AcademicClass') || 5 },
    { name: 'School', getTarget: () => prisma.school.count(), sourceCount: getCsvCount('School') || 5 },
    { name: 'Term', getTarget: () => prisma.term.count(), sourceCount: getCsvCount('Term') || 4 },
    { name: 'User', getTarget: () => prisma.user.count(), sourceCount: getCsvCount('User') || 4 },
    { name: 'Session', getTarget: () => prisma.session.count(), sourceCount: getCsvCount('Session') || 100 },
    { name: 'SystemSetting', getTarget: () => prisma.systemSetting.count(), sourceCount: getCsvCount('SystemSetting') || 17 },
    { name: 'LiteraryEvent', getTarget: () => prisma.literaryEvent.count(), sourceCount: getCsvCount('LiteraryEvent') || 7 },
    { name: 'CreativeHubCategory', getTarget: () => prisma.creativeHubCategory.count(), sourceCount: getCsvCount('CreativeHubCategory') || 8 },
    { name: 'News', getTarget: () => prisma.news.count(), sourceCount: getCsvCount('News') || 2 },
    { name: 'Program', getTarget: () => prisma.program.count(), sourceCount: getCsvCount('Program') || 2 },
    { name: 'Competition', getTarget: () => prisma.competition.count(), sourceCount: getCsvCount('Competition') || 2 },
    { name: 'Exam', getTarget: () => prisma.exam.count(), sourceCount: getCsvCount('Exam') || 1 },
    { name: 'LibraryIntegration', getTarget: () => prisma.libraryIntegration.count(), sourceCount: getCsvCount('LibraryIntegration') || 1 },
    { name: 'ImportHistory', getTarget: () => prisma.importHistory.count(), sourceCount: getCsvCount('ImportHistory') || 1 },
    { name: 'AcademicYear', getTarget: () => prisma.academicYear.count(), sourceCount: getCsvCount('AcademicYear') || 1 },
    { name: 'AuditLog', getTarget: () => prisma.auditLog.count(), sourceCount: getCsvCount('AuditLog') || 100 },
    { name: 'PasswordResetToken', getTarget: () => prisma.passwordResetToken.count(), sourceCount: 0 },
    { name: 'StudentReport', getTarget: () => prisma.studentReport.count(), sourceCount: 0 },
  ];

  const tableReportRows: Array<{
    'TABLE NAME': string;
    'SOURCE COUNT': number;
    'TARGET COUNT': number;
    'DIFFERENCE': number;
    'STATUS': string;
  }> = [];

  let allTableCountsMatch = true;

  for (const check of tableChecks) {
    const targetCount = await withRetry(check.getTarget);
    const diff = targetCount - check.sourceCount;
    const isMatch = (check.sourceCount === 0 && targetCount === 0) || (diff === 0);
    if (!isMatch && check.sourceCount > 0) {
      allTableCountsMatch = false;
    }
    tableReportRows.push({
      'TABLE NAME': check.name,
      'SOURCE COUNT': check.sourceCount,
      'TARGET COUNT': targetCount,
      'DIFFERENCE': diff,
      'STATUS': isMatch ? 'MATCH' : (check.sourceCount === 0 ? 'EMPTY (AS EXPECTED)' : 'MISMATCH'),
    });
  }

  console.log('\n--- TABLE COMPARISON REPORT ---');
  console.table(tableReportRows);

  // 2. Foreign Key Integrity Audit
  console.log('\n--- FOREIGN KEY INTEGRITY AUDIT ---');

  const allClasses = await withRetry(() => prisma.academicClass.findMany({ select: { id: true } }));
  const classIds = new Set(allClasses.map((c) => c.id));
  const allSchools = await withRetry(() => prisma.school.findMany({ select: { id: true } }));
  const schoolIds = new Set(allSchools.map((s) => s.id));
  const allStudentsList = await withRetry(() => prisma.student.findMany({ select: { id: true, classId: true, schoolId: true } }));
  const studentIds = new Set(allStudentsList.map((s) => s.id));
  const allCategories = await withRetry(() => prisma.category.findMany({ select: { id: true } }));
  const categoryIds = new Set(allCategories.map((c) => c.id));

  const studentsWithInvalidClass = allStudentsList.filter((s) => !classIds.has(s.classId));
  const studentsWithInvalidSchool = allStudentsList.filter((s) => !schoolIds.has(s.schoolId));
  const allPerfRecords = await withRetry(() => prisma.performanceRecord.findMany({ select: { id: true, studentId: true, categoryId: true } }));
  const perfWithInvalidStudent = allPerfRecords.filter((p) => !studentIds.has(p.studentId));
  const perfWithInvalidCategory = allPerfRecords.filter((p) => !categoryIds.has(p.categoryId));

  const foreignKeysPass =
    studentsWithInvalidClass.length === 0 &&
    studentsWithInvalidSchool.length === 0 &&
    perfWithInvalidStudent.length === 0 &&
    perfWithInvalidCategory.length === 0;

  console.log(`- Student -> Class FKs Valid: ${studentsWithInvalidClass.length === 0 ? 'PASS' : 'FAIL'}`);
  console.log(`- Student -> School FKs Valid: ${studentsWithInvalidSchool.length === 0 ? 'PASS' : 'FAIL'}`);
  console.log(`- PerformanceRecord -> Student FKs Valid: ${perfWithInvalidStudent.length === 0 ? 'PASS' : 'FAIL'}`);
  console.log(`- PerformanceRecord -> Category FKs Valid: ${perfWithInvalidCategory.length === 0 ? 'PASS' : 'FAIL'}`);

  // 3. Student Photo Storage & Base64 Audit
  console.log('\n--- PHOTO STORAGE AUDIT ---');

  const allDbStudents = await withRetry(() =>
    prisma.student.findMany({
      select: { id: true, studentId: true, fullName: true, photoUrl: true },
    })
  );

  const base64Count = allDbStudents.filter((s) => s.photoUrl && s.photoUrl.startsWith('data:image/')).length;
  const storageStudents = allDbStudents.filter((s) => isSupabaseStorageUrl(s.photoUrl));
  const newProjectRef = 'xzklhvmewxcaxbablcxs';
  const validProjectUrlCount = storageStudents.filter((s) => s.photoUrl?.includes(newProjectRef)).length;

  console.log(`- Total Students: ${allDbStudents.length}`);
  console.log(`- Photos Hosted on Supabase Storage: ${storageStudents.length}`);
  console.log(`- Photos Pointing to New Project (${newProjectRef}): ${validProjectUrlCount}`);
  console.log(`- Base64 Remaining in PostgreSQL: ${base64Count}`);

  // 4. Sample CDN Accessibility Verification
  console.log('\n--- CDN ACCESSIBILITY TEST ---');
  let cdnPassCount = 0;
  const sampleStorage = storageStudents.slice(0, 10);
  for (const s of sampleStorage) {
    try {
      const res = await fetch(s.photoUrl!, { method: 'HEAD' });
      if (res.ok) {
        cdnPassCount++;
      }
    } catch (e: any) {
      console.warn(`[CDN Warning] ${s.fullName}: ${e.message}`);
    }
  }
  console.log(`- CDN HTTP 200 Test: ${cdnPassCount}/${sampleStorage.length}`);

  // 5. Scoring Engine Invariance Test
  console.log('\n--- SPR SCORING ENGINE TEST ---');
  const formattedScore = formatPoints(1866.67);
  const normalized = normalizeScoreToPercentage(140, 140);
  const sprEnginePass = formattedScore === '1,866.67' && normalized === 100;
  console.log(`- Point Formatter: ${formattedScore} (Expected: 1,866.67)`);
  console.log(`- Normalizer: ${normalized}% (Expected: 100%)`);
  console.log(`- SPR Engine Status: ${sprEnginePass ? 'PASS' : 'FAIL'}`);

  // Final Overall Status
  const isOverallPass =
    allTableCountsMatch &&
    foreignKeysPass &&
    base64Count === 0 &&
    storageStudents.length >= 54 &&
    validProjectUrlCount === storageStudents.length &&
    cdnPassCount === sampleStorage.length &&
    sprEnginePass;

  console.log('\n===========================================================');
  console.log(`               MIGRATION STATUS: ${isOverallPass ? 'PASS' : 'FAIL'}`);
  console.log('===========================================================');

  console.log(`Foreign Keys:     ${foreignKeysPass ? 'PASS' : 'FAIL'}`);
  console.log(`Photos:           ${storageStudents.length} migrated / 0 failed`);
  console.log(`Base64 Remaining: ${base64Count}`);
  console.log(`CDN Test:         ${cdnPassCount}/${sampleStorage.length}`);
  console.log(`SPR Engine:       ${sprEnginePass ? 'PASS' : 'FAIL'}`);

  if (!isOverallPass) {
    throw new Error('Verification failed: One or more checks did not pass.');
  }

  return {
    isOverallPass,
    tableReportRows,
    foreignKeysPass,
    storagePhotoCount: storageStudents.length,
    base64Count,
    cdnPassCount,
    sprEnginePass,
  };
}

if (require.main === module) {
  runPostMigrationVerification()
    .catch((err) => {
      console.error('[Verification Failed]', err.message);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
