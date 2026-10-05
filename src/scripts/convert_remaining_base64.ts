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

async function main() {
  console.log('--- Cleaning up any remaining Base64 photos in PostgreSQL ---');

  const allDbStudents = await prisma.student.findMany({
    select: { id: true, studentId: true, sprStudentId: true, fullName: true, photoUrl: true },
  });

  const base64Students = allDbStudents.filter((s) => s.photoUrl && s.photoUrl.startsWith('data:image/'));
  console.log(`Found ${base64Students.length} students with Base64 photo URLs in DB.`);

  for (const st of base64Students) {
    try {
      console.log(`Processing photo for ${st.fullName} (${st.studentId})...`);
      const uploadResult = await uploadBase64StudentPhoto(st.photoUrl!);
      if (uploadResult && uploadResult.url) {
        await prisma.student.update({
          where: { id: st.id },
          data: { photoUrl: uploadResult.url },
        });
        console.log(`✓ Converted to Storage CDN: ${st.fullName} -> ${uploadResult.url}`);
      }
    } catch (err: any) {
      console.error(`✗ Error converting ${st.fullName}:`, err.message);
    }
  }

  const finalCheck = await prisma.student.findMany({
    select: { id: true, photoUrl: true },
  });
  const remainingBase64 = finalCheck.filter((s) => s.photoUrl && s.photoUrl.startsWith('data:image/')).length;
  const storageCount = finalCheck.filter((s) => isSupabaseStorageUrl(s.photoUrl)).length;
  const nullCount = finalCheck.filter((s) => !s.photoUrl).length;

  console.log('\n--- Final Verification ---');
  console.log(`- Storage CDN Photos: ${storageCount}`);
  console.log(`- Base64 Photos:      ${remainingBase64}`);
  console.log(`- Null Photos:        ${nullCount}`);
  console.log(`- Total Students:     ${finalCheck.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
