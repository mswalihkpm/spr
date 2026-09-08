import { calculateAllLeaderboards } from '../lib/spr-engine';
import { prisma } from '../lib/prisma';

async function checkLeaderboard() {
  const lb = await calculateAllLeaderboards();
  console.log(`Leaderboard entries total: ${lb.length}`);
  console.log('Top 15:');
  lb.slice(0, 15).forEach((e) => {
    console.log(`Rank ${e.rank}: ${e.name} (${e.className}) - SPR: ${e.spr}%, Records: ${e.recordsCount}, CatPercentages: ${JSON.stringify(e.categoryPercentages)}`);
  });
}

checkLeaderboard()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
