import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { uploadBase64StudentPhoto, generateTokenizedPhotoPath, isSupabaseStorageUrl } from '../lib/supabase-storage';

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

async function main() {
  console.log('====================================================');
  console.log('   STEP 1: STUDENT PHOTO MIGRATION TO NEW STORAGE   ');
  console.log('====================================================\n');

  const photoBackupFile = path.join(
    process.cwd(),
    'backups',
    'student_photos_backup_2026-09-13T12-52-44-667Z.json'
  );

  if (!fs.existsSync(photoBackupFile)) {
    throw new Error(`Photo backup file not found at: ${photoBackupFile}`);
  }

  const backupContent = JSON.parse(fs.readFileSync(photoBackupFile, 'utf-8'));
  const backupStudentsWithPhotos = backupContent.students.filter(
    (s: any) => s.photoUrl && s.photoUrl.startsWith('data:image/')
  );

  console.log(`Found ${backupStudentsWithPhotos.length} base64 photos in local backup file.`);

  let uploadedCount = 0;
  let failedCount = 0;
  let verifiedHttpOk = 0;

  for (let i = 0; i < backupStudentsWithPhotos.length; i++) {
    const st = backupStudentsWithPhotos[i];
    const indexStr = `[${i + 1}/${backupStudentsWithPhotos.length}]`;

    try {
      const tokenizedPath = generateTokenizedPhotoPath('webp');
      const uploadRes = await uploadBase64StudentPhoto(st.photoUrl, {
        customPath: tokenizedPath,
      });

      // Verify HTTP accessibility
      try {
        const verifyRes = await fetch(uploadRes.url, { method: 'GET' });
        if (verifyRes.ok) {
          verifiedHttpOk++;
        }
      } catch (httpErr) {
        console.warn(`  Warning: Could not verify HTTP immediately: ${uploadRes.url}`);
      }

      // Update student record in database
      const updateResult = await prisma.student.updateMany({
        where: {
          OR: [
            { id: st.id },
            { studentId: st.studentId },
            ...(st.sprStudentId ? [{ sprStudentId: st.sprStudentId }] : []),
          ],
        },
        data: {
          photoUrl: uploadRes.url,
        },
      });

      uploadedCount++;
      console.log(
        `${indexStr} ✓ ${st.fullName} (${st.studentId}) -> ${uploadRes.url} (${updateResult.count} student updated in DB)`
      );
    } catch (err: any) {
      console.error(`${indexStr} ✗ Upload failed for ${st.fullName}:`, err.message);
      failedCount++;
    }
  }

  console.log('\n====================================================');
  console.log('   STEP 2: FULL POST-MIGRATION AUDIT & VERIFICATION  ');
  console.log('====================================================\n');

  const [
    studentCount,
    perfCount,
    litCompCount,
    libRecCount,
    creativeCount,
    subjectCount,
    weightCount,
    mediaCount,
    classCount,
    schoolCount,
    categoryCount,
    subcategoryCount,
    termCount,
    levelCount,
    userCount,
    sessionCount,
    auditCount,
    newsCount,
    programCount,
    compCount,
    litEventCount,
    examCount,
    settingCount,
    importHistCount,
    libIntCount,
    yearCount,
    chCatCount,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.performanceRecord.count(),
    prisma.literaryCompetition.count(),
    prisma.libraryRecord.count(),
    prisma.creativeHubSubmission.count(),
    prisma.subject.count(),
    prisma.categoryWeight.count(),
    prisma.publishedMedia.count(),
    prisma.academicClass.count(),
    prisma.school.count(),
    prisma.category.count(),
    prisma.subcategory.count(),
    prisma.term.count(),
    prisma.level.count(),
    prisma.user.count(),
    prisma.session.count(),
    prisma.auditLog.count(),
    prisma.news.count(),
    prisma.program.count(),
    prisma.competition.count(),
    prisma.literaryEvent.count(),
    prisma.exam.count(),
    prisma.systemSetting.count(),
    prisma.importHistory.count(),
    prisma.libraryIntegration.count(),
    prisma.academicYear.count(),
    prisma.creativeHubCategory.count(),
  ]);

  const auditTable = [
    { Model: 'Student', ExpectedCSV: 115, DatabaseCount: studentCount, Status: studentCount === 115 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'PerformanceRecord', ExpectedCSV: 1024, DatabaseCount: perfCount, Status: perfCount === 1024 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'LiteraryCompetition', ExpectedCSV: 133, DatabaseCount: litCompCount, Status: litCompCount === 133 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'LibraryRecord', ExpectedCSV: 48, DatabaseCount: libRecCount, Status: libRecCount === 48 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'CreativeHubSubmission', ExpectedCSV: 39, DatabaseCount: creativeCount, Status: creativeCount === 39 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'Subject', ExpectedCSV: 52, DatabaseCount: subjectCount, Status: subjectCount === 52 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'CategoryWeight', ExpectedCSV: 15, DatabaseCount: weightCount, Status: weightCount === 15 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'PublishedMedia', ExpectedCSV: 23, DatabaseCount: mediaCount, Status: mediaCount === 23 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'AcademicClass', ExpectedCSV: 5, DatabaseCount: classCount, Status: classCount === 5 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'School', ExpectedCSV: 5, DatabaseCount: schoolCount, Status: schoolCount === 5 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'Category', ExpectedCSV: 7, DatabaseCount: categoryCount, Status: categoryCount === 7 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'Subcategory', ExpectedCSV: 11, DatabaseCount: subcategoryCount, Status: subcategoryCount === 11 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'Term', ExpectedCSV: 4, DatabaseCount: termCount, Status: termCount === 4 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'Level', ExpectedCSV: 11, DatabaseCount: levelCount, Status: levelCount === 11 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'User', ExpectedCSV: 4, DatabaseCount: userCount, Status: userCount === 4 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'Session', ExpectedCSV: 100, DatabaseCount: sessionCount, Status: sessionCount === 100 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'AuditLog', ExpectedCSV: 100, DatabaseCount: auditCount, Status: auditCount === 100 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'News', ExpectedCSV: 2, DatabaseCount: newsCount, Status: newsCount === 2 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'Program', ExpectedCSV: 2, DatabaseCount: programCount, Status: programCount === 2 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'Competition', ExpectedCSV: 2, DatabaseCount: compCount, Status: compCount === 2 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'LiteraryEvent', ExpectedCSV: 7, DatabaseCount: litEventCount, Status: litEventCount === 7 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'CreativeHubCategory', ExpectedCSV: 8, DatabaseCount: chCatCount, Status: chCatCount === 8 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'Exam', ExpectedCSV: 1, DatabaseCount: examCount, Status: examCount === 1 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'SystemSetting', ExpectedCSV: 17, DatabaseCount: settingCount, Status: settingCount === 17 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'ImportHistory', ExpectedCSV: 1, DatabaseCount: importHistCount, Status: importHistCount === 1 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'LibraryIntegration', ExpectedCSV: 1, DatabaseCount: libIntCount, Status: libIntCount === 1 ? '✓ PASS' : 'MISMATCH' },
    { Model: 'AcademicYear', ExpectedCSV: 1, DatabaseCount: yearCount, Status: yearCount === 1 ? '✓ PASS' : 'MISMATCH' },
  ];

  console.table(auditTable);

  const studentsWithStoragePhotos = await prisma.student.findMany({
    where: {
      photoUrl: {
        contains: 'xzklhvmewxcaxbablcxs.supabase.co',
      },
    },
    select: { id: true, studentId: true, fullName: true, photoUrl: true },
  });

  console.log(`\n--- Storage Photo Verification ---`);
  console.log(`Photos Uploaded:               ${uploadedCount}`);
  console.log(`Photos Verified HTTP 200:      ${verifiedHttpOk}`);
  console.log(`Database Students with New URL:${studentsWithStoragePhotos.length}`);
  console.log(`Sample Student Photo URL:      ${studentsWithStoragePhotos[0]?.photoUrl}`);

  return {
    uploadedCount,
    verifiedHttpOk,
    studentsWithStoragePhotos: studentsWithStoragePhotos.length,
    auditTable,
  };
}

main()
  .catch((err) => {
    console.error('[Verification Failed]', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
