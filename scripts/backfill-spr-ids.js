const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfillSprIds() {
  console.log('====================================================');
  console.log('STARTING SPR STUDENT ID SAFE BACKFILL MIGRATION');
  console.log('====================================================');

  // 1. Fetch all existing students ordered deterministically
  const students = await prisma.student.findMany({
    orderBy: [
      { createdAt: 'asc' },
      { studentId: 'asc' },
      { id: 'asc' },
    ],
  });

  console.log(`Found ${students.length} existing student records in database.`);

  let processedCount = 0;
  let assignedCount = 0;
  let errorCount = 0;
  const assignedIds = new Set();
  const errors = [];

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    processedCount++;
    const sequenceNum = i + 1;
    const sprId = `SPR${String(sequenceNum).padStart(4, '0')}`;

    if (assignedIds.has(sprId)) {
      errorCount++;
      errors.push(`Duplicate ID generated in sequence: ${sprId} for student ${student.fullName}`);
      continue;
    }

    try {
      await prisma.student.update({
        where: { id: student.id },
        data: { sprStudentId: sprId },
      });
      assignedIds.add(sprId);
      assignedCount++;
    } catch (err) {
      errorCount++;
      errors.push(`Failed to update student ${student.id} (${student.fullName}): ${err.message}`);
    }
  }

  // 2. Verification Pass
  console.log('\n--- VERIFYING BACKFILL INTEGRITY ---');
  const allUpdated = await prisma.student.findMany({
    select: { id: true, studentId: true, sprStudentId: true, fullName: true },
    orderBy: { sprStudentId: 'asc' },
  });

  const uniqueSprIds = new Set(allUpdated.map(s => s.sprStudentId).filter(Boolean));
  const nullCount = allUpdated.filter(s => !s.sprStudentId).length;
  const duplicateCount = allUpdated.length - uniqueSprIds.size;

  console.log(`Students processed: ${processedCount}`);
  console.log(`SPR IDs assigned: ${assignedCount}`);
  console.log(`Unique SPR IDs in DB: ${uniqueSprIds.size}`);
  console.log(`Null SPR IDs: ${nullCount}`);
  console.log(`Duplicates: ${duplicateCount}`);
  console.log(`Errors: ${errorCount}`);

  if (errors.length > 0) {
    console.error('Error details:', errors);
  }

  console.log('\nSample Assigned Records:');
  allUpdated.slice(0, 5).forEach((s, idx) => {
    console.log(`  ${idx + 1}. ${s.fullName.padEnd(25)} | StudentID: ${s.studentId.padEnd(14)} | SPR ID: ${s.sprStudentId}`);
  });
  console.log('  ...');
  allUpdated.slice(-3).forEach((s, idx) => {
    console.log(`  ${allUpdated.length - 3 + idx + 1}. ${s.fullName.padEnd(25)} | StudentID: ${s.studentId.padEnd(14)} | SPR ID: ${s.sprStudentId}`);
  });

  console.log('\n====================================================');
  if (assignedCount === 117 && duplicateCount === 0 && nullCount === 0 && errorCount === 0) {
    console.log('SUCCESS: All 117 students successfully received unique SPR IDs (SPR0001 - SPR0117)!');
  } else {
    console.log(`COMPLETED with summary: Processed ${processedCount}, Assigned ${assignedCount}, Errors ${errorCount}`);
  }
  console.log('====================================================');
}

backfillSprIds()
  .catch(e => {
    console.error('Fatal migration error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
