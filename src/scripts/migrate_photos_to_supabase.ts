import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import {
  uploadBase64StudentPhoto,
  generateTokenizedPhotoPath,
  getPublicStorageUrl,
  STORAGE_BUCKET,
} from '../lib/supabase-storage';
import { backupStudentPhotos } from './backup_student_photos';

const prisma = new PrismaClient();

export interface MigrationResult {
  studentId: string;
  studentDbId: string;
  fullName: string;
  status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
  oldUrlLength: number;
  newUrl?: string;
  path?: string;
  sizeBytes?: number;
  verifiedAccessible?: boolean;
  error?: string;
}

export async function migratePhotosToSupabase(options?: {
  dryRun?: boolean;
  limit?: number;
  targetStudentId?: string;
  skipBackup?: boolean;
  stopOnError?: boolean;
}): Promise<{
  totalProcessed: number;
  successCount: number;
  skippedCount: number;
  failedCount: number;
  results: MigrationResult[];
}> {
  const isDryRun = options?.dryRun ?? false;
  console.log('====================================================');
  console.log('     MIGRATION: Student Photos to Supabase Storage  ');
  console.log('====================================================');
  if (isDryRun) {
    console.log('*** DRY RUN MODE: No changes will be written to the database ***');
  }

  // Step 1: Automatic Pre-migration Safety Backup
  if (!options?.skipBackup && !isDryRun) {
    console.log('\n[Safety Step] Performing pre-migration backup of all student photos...');
    await backupStudentPhotos();
  }

  // Step 2: Fetch students with Base64 photos
  const students = await prisma.student.findMany({
    where: {
      photoUrl: {
        startsWith: 'data:image/',
      },
      ...(options?.targetStudentId
        ? {
            OR: [
              { id: options.targetStudentId },
              { studentId: options.targetStudentId },
              { sprStudentId: options.targetStudentId },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      studentId: true,
      sprStudentId: true,
      fullName: true,
      photoUrl: true,
    },
    orderBy: { fullName: 'asc' },
    take: options?.limit,
  });

  console.log(`\nFound ${students.length} student(s) with Base64 photos to migrate.`);

  const results: MigrationResult[] = [];
  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  // Step 3: Migrate one student at a time
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const indexStr = `[${i + 1}/${students.length}]`;
    console.log(`\n${indexStr} Processing: ${student.fullName} (${student.studentId || student.sprStudentId})...`);

    if (!student.photoUrl || !student.photoUrl.startsWith('data:image/')) {
      console.log(`  -> Skipped: No Base64 photo found.`);
      results.push({
        studentId: student.studentId,
        studentDbId: student.id,
        fullName: student.fullName,
        status: 'SKIPPED',
        oldUrlLength: student.photoUrl?.length || 0,
      });
      skippedCount++;
      continue;
    }

    try {
      const tokenizedPath = generateTokenizedPhotoPath('webp');

      if (isDryRun) {
        console.log(`  -> [Dry Run] Would optimize Base64 (${(student.photoUrl.length / 1024).toFixed(1)} KB) -> WebP`);
        console.log(`  -> [Dry Run] Would upload to: ${tokenizedPath}`);
        const prospectiveUrl = getPublicStorageUrl(tokenizedPath, STORAGE_BUCKET);
        console.log(`  -> [Dry Run] Prospective URL: ${prospectiveUrl}`);

        results.push({
          studentId: student.studentId,
          studentDbId: student.id,
          fullName: student.fullName,
          status: 'SUCCESS',
          oldUrlLength: student.photoUrl.length,
          newUrl: prospectiveUrl,
          path: tokenizedPath,
          verifiedAccessible: true,
        });
        successCount++;
        continue;
      }

      // 3a. Upload optimized WebP to Supabase Storage
      console.log(`  -> Optimizing & Uploading to Supabase Storage (${tokenizedPath})...`);
      const uploadRes = await uploadBase64StudentPhoto(student.photoUrl, {
        customPath: tokenizedPath,
      });

      // 3b. Verification: Verify the uploaded Storage image is accessible via HTTP GET
      console.log(`  -> Verifying accessibility of uploaded URL: ${uploadRes.url}`);
      let isAccessible = false;
      try {
        const verifyRes = await fetch(uploadRes.url, { method: 'GET' });
        const contentType = verifyRes.headers.get('content-type') || '';
        if (verifyRes.ok && contentType.includes('image')) {
          isAccessible = true;
          console.log(`  -> Verification PASSED: Status 200 OK (${contentType})`);
        } else {
          console.warn(`  -> Verification WARNING: Status ${verifyRes.status}, Content-Type: ${contentType}`);
        }
      } catch (verifyErr: any) {
        console.error(`  -> Verification FAILED: Network error: ${verifyErr.message}`);
      }

      if (!isAccessible) {
        throw new Error(`Uploaded image verification failed: Object not publicly accessible at ${uploadRes.url}`);
      }

      // 3c. Safe atomic update in PostgreSQL
      console.log(`  -> Updating PostgreSQL record with new lightweight URL...`);
      await prisma.student.update({
        where: { id: student.id },
        data: { photoUrl: uploadRes.url },
      });

      console.log(`  -> SUCCESS! Database photoUrl updated.`);
      console.log(`     Old size: ${(student.photoUrl.length / 1024).toFixed(1)} KB | New URL size: ${uploadRes.url.length} chars | Image size: ${(uploadRes.sizeBytes / 1024).toFixed(1)} KB`);

      results.push({
        studentId: student.studentId,
        studentDbId: student.id,
        fullName: student.fullName,
        status: 'SUCCESS',
        oldUrlLength: student.photoUrl.length,
        newUrl: uploadRes.url,
        path: uploadRes.path,
        sizeBytes: uploadRes.sizeBytes,
        verifiedAccessible: true,
      });
      successCount++;
    } catch (err: any) {
      console.error(`  -> FAILED for ${student.fullName}: ${err.message}`);
      console.warn(`  -> Database photoUrl remains completely UNCHANGED for safety.`);

      results.push({
        studentId: student.studentId,
        studentDbId: student.id,
        fullName: student.fullName,
        status: 'FAILED',
        oldUrlLength: student.photoUrl.length,
        error: err.message,
      });
      failedCount++;

      if (options?.stopOnError !== false) {
        console.error(`\n[CRITICAL STOP] Halting migration immediately due to failure on student: ${student.fullName} (${student.studentId || student.id})`);
        break;
      }
    }
  }

  // Step 4: Write migration log
  const logsDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const logFilePath = path.join(logsDir, `migration_log_${timestampStr}.json`);
  fs.writeFileSync(
    logFilePath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        dryRun: isDryRun,
        total: students.length,
        successCount,
        skippedCount,
        failedCount,
        results,
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log('\n====================================================');
  console.log('              MIGRATION BATCH COMPLETE               ');
  console.log('====================================================');
  console.log(`- Total Processed: ${students.length}`);
  console.log(`- Successful:      ${successCount}`);
  console.log(`- Skipped:         ${skippedCount}`);
  console.log(`- Failed:          ${failedCount}`);
  console.log(`- Migration Log:   ${logFilePath}`);

  return {
    totalProcessed: students.length,
    successCount,
    skippedCount,
    failedCount,
    results,
  };
}

// Run standalone if invoked directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const skipBackup = args.includes('--skip-backup');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
  const studentIdArg = args.find((a) => a.startsWith('--student='));
  const targetStudentId = studentIdArg ? studentIdArg.split('=')[1] : undefined;

  migratePhotosToSupabase({
    dryRun: isDryRun,
    skipBackup,
    limit,
    targetStudentId,
  })
    .catch((err) => {
      console.error('[Migration Exception]', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
