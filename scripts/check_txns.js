const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  
  const totalCount = await prisma.walletTransaction.count();
  const last15DaysCount = await prisma.walletTransaction.count({
    where: { createdAt: { gte: fifteenDaysAgo } }
  });
  console.log('Total wallet transactions in DB:', totalCount);
  console.log('Transactions created in last 15 days (>= ' + fifteenDaysAgo.toISOString() + '):', last15DaysCount);

  // Group by date
  const recent = await prisma.walletTransaction.findMany({
    select: { id: true, createdAt: true, type: true, amount: true, description: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('Most recent transactions:', recent);
}

main().catch(console.error).finally(() => prisma.$disconnect());
