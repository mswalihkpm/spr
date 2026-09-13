import { prisma } from '../lib/prisma';

async function checkBloat() {
  const students = await prisma.student.findMany({
    select: {
      id: true,
      fullName: true,
      photoUrl: true,
    },
  });

  console.log('--- Checking Student photoUrl Sizes ---');
  let totalPhotoSize = 0;
  let largePhotos = 0;
  students.forEach((s) => {
    if (s.photoUrl) {
      const len = s.photoUrl.length;
      totalPhotoSize += len;
      if (len > 50000) {
        largePhotos++;
        console.log(`Student ${s.fullName} (${s.id}) photoUrl size: ${(len / 1024).toFixed(1)} KB`);
      }
    }
  });
  console.log(`Total photoUrl data across ${students.length} students: ${(totalPhotoSize / 1024 / 1024).toFixed(2)} MB (${largePhotos} large base64 photos)`);

  const perfRecords = await prisma.performanceRecord.findMany({
    select: {
      id: true,
      remarks: true,
    },
  });
  console.log(`Total Performance Records: ${perfRecords.length}`);

  const creative = await prisma.creativeHubSubmission.findMany({
    select: {
      id: true,
      title: true,
      content: true,
      attachmentUrl: true,
      remarks: true,
    },
  });
  let totalCreativeSize = 0;
  creative.forEach((c) => {
    totalCreativeSize += (c.content?.length || 0) + (c.attachmentUrl?.length || 0);
  });
  console.log(`Total Creative Submissions data: ${(totalCreativeSize / 1024).toFixed(1)} KB`);
}

checkBloat().catch(console.error).finally(() => prisma.$disconnect());
