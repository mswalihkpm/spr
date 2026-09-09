const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, action: true, entity: true, userName: true, createdAt: true, newValue: true, previousValue: true }
  });
  console.log('ALL_AUDIT_LOGS:', JSON.stringify(logs, null, 2));

  const importHistories = await prisma.importHistory.findMany();
  console.log('IMPORT_HISTORIES:', JSON.stringify(importHistories, null, 2));
}

main().finally(() => prisma.$disconnect());
