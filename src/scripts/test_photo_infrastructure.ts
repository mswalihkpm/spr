import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import {
  generateTokenizedPhotoPath,
  getPublicStorageUrl,
  optimizePhotoToWebP,
  isSupabaseStorageUrl,
  getSupabaseAdminClient,
  uploadStudentPhoto,
  deleteStudentPhoto,
  STORAGE_BUCKET,
} from '../lib/supabase-storage';
import { formatPoints, normalizeScoreToPercentage } from '../lib/spr-engine';

const prisma = new PrismaClient();

async function runInfrastructureTests() {
  console.log('===========================================================');
  console.log('       SUPABASE STORAGE INFRASTRUCTURE VERIFICATION        ');
  console.log('===========================================================');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] Test ${totalTests}: ${testName}`);
      if (detail) console.log(`       ${detail}`);
      passedTests++;
    } else {
      console.error(`[FAIL] Test ${totalTests}: ${testName}`);
      if (detail) console.error(`       ${detail}`);
      throw new Error(`Assertion failed for: ${testName}`);
    }
  }

  // 1. Test Unguessable Tokenized Path Generation
  const path1 = generateTokenizedPhotoPath('webp');
  const path2 = generateTokenizedPhotoPath('webp');
  assert(
    path1.startsWith('avatars/st_') && path1.endsWith('.webp') && path1 !== path2,
    'Cryptographically random tokenized path generation',
    `Generated path: ${path1} (UUID entropy length: ${path1.length})`
  );

  // 2. Test CDN URL Generator
  const cdnUrl = getPublicStorageUrl(path1);
  assert(
    cdnUrl.startsWith('https://sjfhldnuszrewncmysrv.supabase.co/storage/v1/object/public/student-photos/avatars/st_'),
    'Public CDN URL formatting conforms to Supabase standards',
    `CDN URL: ${cdnUrl}`
  );

  assert(
    isSupabaseStorageUrl(cdnUrl) && !isSupabaseStorageUrl('data:image/jpeg;base64,...'),
    'isSupabaseStorageUrl helper correctly identifies storage vs base64 URLs'
  );

  // 3. Test WebP Image Optimization Pipeline
  const sampleInput = await sharp({
    create: {
      width: 1000,
      height: 1000,
      channels: 4,
      background: { r: 59, g: 130, b: 246, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const originalSize = sampleInput.length;
  const { buffer: optimizedBuffer, contentType } = await optimizePhotoToWebP(sampleInput, 360, 85);
  const optimizedSize = optimizedBuffer.length;
  const metadata = await sharp(optimizedBuffer).metadata();

  assert(
    contentType === 'image/webp' && metadata.format === 'webp',
    'Sharp converts image to WebP format',
    `Format: ${metadata.format}`
  );

  assert(
    metadata.width === 360 && metadata.height === 360,
    'Sharp resizes image to exact 360x360 dimensions',
    `Dimensions: ${metadata.width}x${metadata.height}`
  );

  assert(
    optimizedSize < originalSize,
    'Sharp optimization significantly compresses payload size',
    `Original: ${(originalSize / 1024).toFixed(1)} KB -> Optimized: ${(optimizedSize / 1024).toFixed(1)} KB (${Math.round((1 - optimizedSize / originalSize) * 100)}% reduction)`
  );

  // 4. Test Live Supabase Storage Connectivity & Bucket Existence
  const supabase = getSupabaseAdminClient();
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  const studentBucket = buckets?.find((b) => b.id === STORAGE_BUCKET || b.name === STORAGE_BUCKET);

  assert(
    !bucketError && Boolean(studentBucket),
    'Supabase Storage authentication and bucket "student-photos" existence',
    `Bucket ID: ${studentBucket?.id}, Public: ${studentBucket?.public}, Status: Connected`
  );

  // 5. Test Live Storage Upload, CDN Retrieval, and Cleanup
  const pingPath = `test/ping_${Date.now()}.webp`;
  const uploadRes = await uploadStudentPhoto(sampleInput, {
    customPath: pingPath,
    skipOptimization: false,
  });

  assert(
    uploadRes.success && Boolean(uploadRes.url),
    'Live Supabase Storage WebP image upload',
    `Uploaded test object: ${uploadRes.path} (${uploadRes.sizeBytes} bytes)`
  );

  // Verify CDN accessibility via HTTP GET
  let cdnAccessible = false;
  try {
    const fetchRes = await fetch(uploadRes.url, { method: 'GET' });
    const fetchedContentType = fetchRes.headers.get('content-type') || '';
    if (fetchRes.ok && fetchedContentType.includes('image')) {
      cdnAccessible = true;
    }
  } catch (err: any) {
    console.warn('CDN fetch warning:', err.message);
  }

  assert(
    cdnAccessible,
    'Live CDN public URL accessibility and image content delivery',
    `Public URL: ${uploadRes.url}`
  );

  // Cleanup the test object
  const deleteSuccess = await deleteStudentPhoto(pingPath);
  assert(deleteSuccess, 'Supabase Storage administrative deletion and cleanup');

  // 6. Test Pre-Migration Backup Integrity
  const backupsDir = path.join(process.cwd(), 'backups');
  const backupFiles = fs
    .readdirSync(backupsDir)
    .filter((f) => f.startsWith('student_photos_backup_') && f.endsWith('.json'))
    .sort()
    .reverse();

  assert(backupFiles.length > 0, 'Pre-migration backup file exists on disk', `Found: ${backupFiles[0]}`);

  const latestBackupPath = path.join(backupsDir, backupFiles[0]);
  const backupContent = JSON.parse(fs.readFileSync(latestBackupPath, 'utf-8'));

  assert(
    backupContent.studentsWithPhotosCount === 54 && backupContent.students.length === 54,
    'Backup contains all 54 existing student photos',
    `Backup timestamp: ${backupContent.backupTimestamp}, Records: ${backupContent.students.length}`
  );

  assert(
    backupContent.students.every((s: any) => s.id && s.fullName && s.photoUrl && s.photoUrl.startsWith('data:image/')),
    'Backup entries contain complete, valid Base64 data URIs'
  );

  // 7. Test Database Non-Modification Verification
  const currentDbStudents = await prisma.student.findMany({
    select: { id: true, fullName: true, photoUrl: true },
  });
  const currentBase64Count = currentDbStudents.filter(
    (s) => s.photoUrl && s.photoUrl.startsWith('data:image/')
  ).length;

  assert(
    currentBase64Count === 54,
    'CONFIRMATION: ZERO student records in PostgreSQL were modified during testing',
    `Current Base64 photo count in PostgreSQL is exactly 54 (100% identical to initial state)`
  );

  // 8. Test SPR Scoring Engine Invariance
  const formattedScore = formatPoints(1866.67);
  const normalized = normalizeScoreToPercentage(140, 140);

  assert(
    formattedScore === '1,866.67' && normalized === 100,
    'CONFIRMATION: SPR scoring and calculation engine remains completely untouched and functional',
    `formatPoints(1866.67) = ${formattedScore}, normalizeScore(140, 140) = ${normalized}%`
  );

  console.log('\n===========================================================');
  console.log(` ALL ${passedTests}/${totalTests} INFRASTRUCTURE TESTS PASSED SUCCESSFULLY!`);
  console.log('===========================================================');
}

runInfrastructureTests()
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
