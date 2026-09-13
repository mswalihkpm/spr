import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { StudentPhotoBackupFile } from './backup_student_photos';

const prisma = new PrismaClient();

export async function rollbackStudentPhotos(
  backupFilePath?: string,
  dryRun: boolean = false
): Promise<{
  restoredCount: number;
  skippedCount: number;
  errors: string[];
}> {
  console.log('--- Starting Student Photos Rollback ---');
  if (dryRun) {
    console.log('*** DRY RUN MODE: No database changes will be committed ***');
  }

  // 1. Locate backup file
  let resolvedPath = backupFilePath;
  const backupsDir = path.join(process.cwd(), 'backups');

  if (!resolvedPath) {
    if (!fs.existsSync(backupsDir)) {
      throw new Error(`Backups directory does not exist at: ${backupsDir}`);
    }

    const files = fs
      .readdirSync(backupsDir)
      .filter((f) => f.startsWith('student_photos_backup_') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      throw new Error(`No backup files found in ${backupsDir}`);
    }

    resolvedPath = path.join(backupsDir, files[0]);
  }

  console.log(`Using backup file: ${resolvedPath}`);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Specified backup file not found: ${resolvedPath}`);
  }

  // 2. Read and validate backup
  const rawContent = fs.readFileSync(resolvedPath, 'utf-8');
  const backupData: StudentPhotoBackupFile = JSON.parse(rawContent);

  console.log(`Backup Timestamp: ${backupData.backupTimestamp}`);
  console.log(`Total records in backup: ${backupData.students.length}`);

  let restoredCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  // 3. Restore records one by one
  for (const entry of backupData.students) {
    try {
      const currentStudent = await prisma.student.findUnique({
        where: { id: entry.id },
        select: { id: true, fullName: true, photoUrl: true },
      });

      if (!currentStudent) {
        console.warn(`[Skip] Student ID ${entry.id} (${entry.fullName}) not found in database.`);
        skippedCount++;
        continue;
      }

      if (currentStudent.photoUrl === entry.photoUrl) {
        skippedCount++;
        continue;
      }

      if (!dryRun) {
        await prisma.student.update({
          where: { id: entry.id },
          data: { photoUrl: entry.photoUrl },
        });
      }

      restoredCount++;
      console.log(
        `[Restored] ${entry.fullName} (${entry.studentId}) -> Photo URL reverted (${entry.isBase64 ? 'Base64' : 'HTTPS'})`
      );
    } catch (err: any) {
      const msg = `Failed to restore student ${entry.fullName} (${entry.id}): ${err?.message}`;
      console.error(`[Error] ${msg}`);
      errors.push(msg);
    }
  }

  console.log('--- Rollback Summary ---');
  console.log(`- Successfully Restored: ${restoredCount}`);
  console.log(`- Skipped (already matching or not found): ${skippedCount}`);
  console.log(`- Errors: ${errors.length}`);

  return { restoredCount, skippedCount, errors };
}

// Run standalone if invoked directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const customFile = args.find((a) => !a.startsWith('--'));

  rollbackStudentPhotos(customFile, isDryRun)
    .catch((err) => {
      console.error('[Rollback Error]', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
