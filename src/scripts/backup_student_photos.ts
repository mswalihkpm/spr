import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export interface StudentPhotoBackupEntry {
  id: string;
  studentId: string;
  sprStudentId: string | null;
  fullName: string;
  division: string;
  classId: string;
  photoUrl: string | null;
  isBase64: boolean;
  photoLength: number;
}

export interface StudentPhotoBackupFile {
  backupTimestamp: string;
  totalStudents: number;
  studentsWithPhotosCount: number;
  base64PhotosCount: number;
  httpPhotosCount: number;
  students: StudentPhotoBackupEntry[];
}

export async function backupStudentPhotos(): Promise<{
  backupFilePath: string;
  backupData: StudentPhotoBackupFile;
}> {
  console.log('--- Starting Student Photos Backup ---');

  // 1. Fetch all student records
  const allStudents = await prisma.student.findMany({
    select: {
      id: true,
      studentId: true,
      sprStudentId: true,
      fullName: true,
      division: true,
      classId: true,
      photoUrl: true,
    },
    orderBy: { fullName: 'asc' },
  });

  const studentsWithPhotos = allStudents.filter(
    (s) => s.photoUrl && s.photoUrl.trim().length > 0
  );

  const entries: StudentPhotoBackupEntry[] = studentsWithPhotos.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    sprStudentId: s.sprStudentId,
    fullName: s.fullName,
    division: s.division,
    classId: s.classId,
    photoUrl: s.photoUrl,
    isBase64: Boolean(s.photoUrl?.startsWith('data:image/')),
    photoLength: s.photoUrl ? s.photoUrl.length : 0,
  }));

  const base64Count = entries.filter((e) => e.isBase64).length;
  const httpCount = entries.filter((e) => !e.isBase64).length;

  const backupData: StudentPhotoBackupFile = {
    backupTimestamp: new Date().toISOString(),
    totalStudents: allStudents.length,
    studentsWithPhotosCount: entries.length,
    base64PhotosCount: base64Count,
    httpPhotosCount: httpCount,
    students: entries,
  };

  // 2. Ensure backups directory exists
  const backupsDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  // 3. Write backup to file with ISO timestamp and safe naming
  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `student_photos_backup_${timestampStr}.json`;
  const backupFilePath = path.join(backupsDir, backupFileName);

  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');

  // 4. Verify the backup file was written properly and is readable
  const writtenContent = fs.readFileSync(backupFilePath, 'utf-8');
  const parsed = JSON.parse(writtenContent);
  if (parsed.students.length !== entries.length) {
    throw new Error('Verification failed: backup file student count mismatch.');
  }

  const fileSizeMB = (fs.statSync(backupFilePath).size / (1024 * 1024)).toFixed(2);

  console.log(`[Backup Success] File saved to: ${backupFilePath}`);
  console.log(`- Backup file size: ${fileSizeMB} MB`);
  console.log(`- Total students checked: ${allStudents.length}`);
  console.log(`- Total students with photos: ${entries.length}`);
  console.log(`- Base64 photos backed up: ${base64Count}`);
  console.log(`- HTTPS Storage photos backed up: ${httpCount}`);

  return { backupFilePath, backupData };
}

// Run standalone if invoked directly
if (require.main === module) {
  backupStudentPhotos()
    .catch((err) => {
      console.error('[Backup Error]', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
