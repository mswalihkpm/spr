const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function isValidSprId(id) {
  if (!id || typeof id !== 'string') return false;
  return /^SPR\d{4,}$/i.test(id.trim());
}

function normalizeSprId(id) {
  if (!id) return '';
  return id.trim().toUpperCase();
}

async function generateNextSprId(db = prisma) {
  const existingStudents = await db.student.findMany({
    where: { sprStudentId: { not: null } },
    select: { sprStudentId: true },
  });

  let maxNumber = 0;
  for (const s of existingStudents) {
    if (!s.sprStudentId) continue;
    const match = s.sprStudentId.trim().match(/^SPR(\d+)$/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  return `SPR${String(maxNumber + 1).padStart(4, '0')}`;
}

async function checkSprIdAvailable(sprId, excludeStudentId, db = prisma) {
  const normalized = normalizeSprId(sprId);
  if (!normalized) {
    return { available: false, error: 'SPR Student ID cannot be empty.' };
  }
  if (!isValidSprId(normalized)) {
    return {
      available: false,
      error: `Invalid SPR Student ID format "${sprId}". Format must be SPR followed by at least 4 digits (e.g. SPR0001).`,
    };
  }

  const existing = await db.student.findFirst({
    where: {
      sprStudentId: { equals: normalized, mode: 'insensitive' },
      ...(excludeStudentId ? { id: { not: excludeStudentId } } : {}),
    },
    select: { id: true, sprStudentId: true, fullName: true },
  });

  if (existing) {
    return {
      available: false,
      error: 'SPR Student ID already exists. Please use a unique ID.',
    };
  }

  return { available: true };
}

async function testE2E() {
  console.log('====================================================');
  console.log('STARTING SPR STUDENT ID E2E SIMULATION TEST');
  console.log('====================================================\n');

  // 1. Test generator
  const nextId = await generateNextSprId(prisma);
  console.log('1. Generated next SPR ID:', nextId);
  if (nextId !== 'SPR0118') {
    throw new Error(`Expected SPR0118, received ${nextId}`);
  }

  // 2. Test duplicate validation on existing ID
  const dupCheck = await checkSprIdAvailable('SPR0001', undefined, prisma);
  console.log('2. Check availability on SPR0001 (should fail):', dupCheck);
  if (dupCheck.available || dupCheck.error !== 'SPR Student ID already exists. Please use a unique ID.') {
    throw new Error('Duplicate check failed to return exact required message for SPR0001');
  }

  // 3. Test duplicate validation on available ID
  const availCheck = await checkSprIdAvailable(nextId, undefined, prisma);
  console.log(`3. Check availability on ${nextId} (should pass):`, availCheck);
  if (!availCheck.available) {
    throw new Error(`Available check failed for ${nextId}`);
  }

  // 4. Test format validations
  console.log('4. Testing format validations:');
  console.log('   isValidSprId("SPR0001"):', isValidSprId('SPR0001'));
  console.log('   isValidSprId("spr0117"):', isValidSprId('spr0117'));
  console.log('   isValidSprId("SPR12345"):', isValidSprId('SPR12345'));
  console.log('   isValidSprId("INVALID"):', isValidSprId('INVALID'));
  console.log('   isValidSprId("SPR12"):', isValidSprId('SPR12'));

  if (!isValidSprId('SPR0001') || !isValidSprId('spr0117') || isValidSprId('INVALID') || isValidSprId('SPR12')) {
    throw new Error('Format validation logic failed assertions');
  }

  // 5. Test search queries
  console.log('\n5. Testing search query by SPR ID (e.g. SPR0001, SPR0050, SPR0117):');
  const s1 = await prisma.student.findFirst({
    where: { sprStudentId: { equals: 'SPR0001', mode: 'insensitive' } },
    select: { fullName: true, sprStudentId: true, studentId: true },
  });
  const s50 = await prisma.student.findFirst({
    where: { sprStudentId: { equals: 'spr0050', mode: 'insensitive' } },
    select: { fullName: true, sprStudentId: true, studentId: true },
  });
  const s117 = await prisma.student.findFirst({
    where: { sprStudentId: { equals: 'SPR0117', mode: 'insensitive' } },
    select: { fullName: true, sprStudentId: true, studentId: true },
  });

  console.log('   Found SPR0001:', s1);
  console.log('   Found SPR0050 (searched lowercase spr0050):', s50);
  console.log('   Found SPR0117:', s117);

  if (!s1 || !s50 || !s117) {
    throw new Error('Search failed for one or more sample SPR IDs');
  }

  console.log('\n====================================================');
  console.log('E2E SIMULATION VERIFICATION: ALL CHECKS PASSED 100%');
  console.log('====================================================');
}

testE2E()
  .catch(e => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
