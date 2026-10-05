import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { uploadBase64StudentPhoto, isSupabaseStorageUrl } from '../lib/supabase-storage';

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

async function main() {
  console.log('--- Checking & Linking All 54 Student Photos ---');

  const photoBackupFile = path.join(
    process.cwd(),
    'backups',
    'student_photos_backup_2026-09-13T12-52-44-667Z.json'
  );

  const backupContent = JSON.parse(fs.readFileSync(photoBackupFile, 'utf-8'));
  const photoStudents = backupContent.students.filter((s: any) => s.photoUrl && s.photoUrl.startsWith('data:image/'));

  console.log(`Total students with photos in backup: ${photoStudents.length}`);

  const allDbStudents = await withRetry(() =>
    prisma.student.findMany({
      select: { id: true, studentId: true, sprStudentId: true, fullName: true, photoUrl: true },
    })
  );

  console.log(`Total students in PostgreSQL: ${allDbStudents.length}`);

  let linkedCount = 0;
  let alreadyValidCount = 0;

  for (let i = 0; i < photoStudents.length; i++) {
    const st = photoStudents[i];
    const dbStudent = allDbStudents.find(
      (s) =>
        s.id === st.id ||
        s.studentId === st.studentId ||
        (st.sprStudentId && s.sprStudentId === st.sprStudentId)
    );

    if (!dbStudent) {
      console.warn(`[Warning] No matching DB student found for ${st.fullName} (${st.studentId})`);
      continue;
    }

    if (isSupabaseStorageUrl(dbStudent.photoUrl)) {
      alreadyValidCount++;
      continue;
    }

    try {
      console.log(`[${i + 1}/${photoStudents.length}] Uploading photo for ${st.fullName}...`);
      const uploadResult = await uploadBase64StudentPhoto(st.photoUrl);
      if (uploadResult && uploadResult.url) {
        await withRetry(() =>
          prisma.student.update({
            where: { id: dbStudent.id },
            data: { photoUrl: uploadResult.url },
          })
        );
        dbStudent.photoUrl = uploadResult.url;
        linkedCount++;
        console.log(`  ✓ Linked: ${st.fullName} -> ${uploadResult.url}`);
      }
    } catch (err: any) {
      console.error(`  ✗ Failed to upload for ${st.fullName}:`, err.message);
    }
  }

  const finalStudents = await withRetry(() =>
    prisma.student.findMany({
      select: { id: true, photoUrl: true },
    })
  );

  const finalStorageCount = finalStudents.filter((s) => isSupabaseStorageUrl(s.photoUrl)).length;
  const finalBase64Count = finalStudents.filter((s) => s.photoUrl && s.photoUrl.startsWith('data:image/')).length;
  const finalNullCount = finalStudents.filter((s) => !s.photoUrl).length;

  console.log('\n--- Final Photo Status in Database ---');
  console.log(`- Students with Storage CDN URLs: ${finalStorageCount}`);
  console.log(`- Students with Base64:            ${finalBase64Count}`);
  console.log(`- Students with No Photo:          ${finalNullCount}`);
  console.log(`- Total Students:                  ${finalStudents.length}`);
}

main()
  .catch((err) => {
    console.error('[Error]', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
