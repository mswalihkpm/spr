const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('ALTER TABLE "WalletTransaction" ADD COLUMN IF NOT EXISTS "senderStudentId" TEXT;');
  console.log('✅ Added senderStudentId to WalletTransaction!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
