import { prisma } from '../lib/prisma';

async function testWithAndWithoutPhotos() {
  console.log('=== BENCHMARK: WITH vs WITHOUT BASE64 photoUrl ===\n');

  // Test 1: Current Query (With photoUrl)
  const start1 = performance.now();
  const withPhotos = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    include: {
      class: true,
      school: true,
      academicYear: true,
      performanceRecords: {
        include: {
          category: true,
          subject: { include: { institution: true, board: true } },
          competition: { include: { program: true } },
          literaryCompetition: { include: { event: true } },
          subcategory: true,
          level: true,
        },
      },
      creativeWorks: { include: { category: true } },
      libraryRecords: true,
    },
  });
  const timeWithPhotos = performance.now() - start1;
  const sizeWithPhotos = Buffer.byteLength(JSON.stringify(withPhotos));

  // Test 2: Optimized Query (Selecting student fields without heavy photoUrl, or selecting photoUrl only on student profile page)
  const start2 = performance.now();
  const withoutPhotos = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      studentId: true,
      sprStudentId: true,
      fullName: true,
      division: true,
      status: true,
      academicYearId: true,
      classId: true,
      schoolId: true,
      class: true,
      school: true,
      academicYear: true,
      performanceRecords: {
        include: {
          category: true,
          subject: { include: { institution: true, board: true } },
          competition: { include: { program: true } },
          literaryCompetition: { include: { event: true } },
          subcategory: true,
          level: true,
        },
      },
      creativeWorks: { include: { category: true } },
      libraryRecords: true,
    },
  });
  const timeWithoutPhotos = performance.now() - start2;
  const sizeWithoutPhotos = Buffer.byteLength(JSON.stringify(withoutPhotos));

  // Test 3: Admin scores query WITH student.photoUrl vs WITHOUT student.photoUrl
  const start3 = performance.now();
  const scoresWithPhotos = await prisma.performanceRecord.findMany({
    include: {
      student: { include: { class: true, school: true } },
      category: true,
      subcategory: true,
      subject: { include: { institution: true, board: true } },
      exam: { include: { term: true } },
      competition: { include: { program: true } },
      literaryCompetition: { include: { event: true } },
      level: true,
    },
    take: 200,
  });
  const timeScoresWith = performance.now() - start3;
  const sizeScoresWith = Buffer.byteLength(JSON.stringify(scoresWithPhotos));

  const start4 = performance.now();
  const scoresWithoutPhotos = await prisma.performanceRecord.findMany({
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          studentId: true,
          sprStudentId: true,
          division: true,
          class: true,
          school: true,
        },
      },
      category: true,
      subcategory: true,
      subject: { include: { institution: true, board: true } },
      exam: { include: { term: true } },
      competition: { include: { program: true } },
      literaryCompetition: { include: { event: true } },
      level: true,
    },
    take: 200,
  });
  const timeScoresWithout = performance.now() - start4;
  const sizeScoresWithout = Buffer.byteLength(JSON.stringify(scoresWithoutPhotos));

  console.log(`1. Engine Snapshot (With Photos):    ${timeWithPhotos.toFixed(1)} ms | Size: ${(sizeWithPhotos / 1024).toFixed(1)} KB`);
  console.log(`2. Engine Snapshot (Without Photos): ${timeWithoutPhotos.toFixed(1)} ms | Size: ${(sizeWithoutPhotos / 1024).toFixed(1)} KB`);
  console.log(`   --> SPEEDUP: ${(timeWithPhotos / timeWithoutPhotos).toFixed(1)}x faster, payload reduced by ${(100 - (sizeWithoutPhotos / sizeWithPhotos) * 100).toFixed(1)}%\n`);

  console.log(`3. Admin Scores (With Photos):       ${timeScoresWith.toFixed(1)} ms | Size: ${(sizeScoresWith / 1024).toFixed(1)} KB`);
  console.log(`4. Admin Scores (Without Photos):    ${timeScoresWithout.toFixed(1)} ms | Size: ${(sizeScoresWithout / 1024).toFixed(1)} KB`);
  console.log(`   --> SPEEDUP: ${(timeScoresWith / timeScoresWithout).toFixed(1)}x faster, payload reduced by ${(100 - (sizeScoresWithout / sizeScoresWith) * 100).toFixed(1)}%\n`);
}

testWithAndWithoutPhotos().catch(console.error).finally(() => prisma.$disconnect());
