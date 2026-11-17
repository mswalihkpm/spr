const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Creating PointCorrectionReason & StudentPointAdjustment tables ---');

  // 1. PointCorrectionReason table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PointCorrectionReason" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "basePoint" DECIMAL(6, 2) NOT NULL DEFAULT 1.00,
      "description" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ PointCorrectionReason table verified/created.');

  // 2. StudentPointAdjustment table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StudentPointAdjustment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "reasonId" TEXT NOT NULL,
      "points" DECIMAL(6, 2) NOT NULL,
      "notes" TEXT,
      "createdById" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "fk_spa_student" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE,
      CONSTRAINT "fk_spa_reason" FOREIGN KEY ("reasonId") REFERENCES "PointCorrectionReason"("id") ON DELETE CASCADE
    );
  `);
  console.log('✅ StudentPointAdjustment table verified/created.');

  // 3. Create indices
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_spa_studentId" ON "StudentPointAdjustment"("studentId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_spa_reasonId" ON "StudentPointAdjustment"("reasonId");
  `);
  console.log('✅ Indices verified/created.');

  // Check columns
  const cols = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('PointCorrectionReason', 'StudentPointAdjustment')
    ORDER BY table_name, column_name;
  `);
  console.log('Columns created:', cols);
}

main().catch(console.error).finally(() => prisma.$disconnect());
