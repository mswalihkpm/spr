const { calculateAllLeaderboards } = require('./src/lib/spr-engine');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLeaderboard() {
  const lb = await calculateAllLeaderboards();
  console.log(`Leaderboard entries total: ${lb.length}`);
  console.log('Top 10:');
  lb.slice(0, 10).forEach((e) => {
    console.log(`Rank ${e.rank}: ${e.name} (${e.className}) - SPR: ${e.spr}%, Records: ${e.recordsCount}, CatPercentages: ${JSON.stringify(e.categoryPercentages)}`);
  });
}

checkLeaderboard()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
