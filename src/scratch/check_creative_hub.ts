import { prisma } from '../lib/prisma';
import { calculateAllLeaderboards } from '../lib/spr-engine';

async function main() {
  const chCat = await prisma.category.findFirst({ where: { code: 'CREATIVE_HUB' } });
  console.log('Category CREATIVE_HUB in DB:', chCat);

  const chSubmissions = await prisma.creativeHubSubmission.findMany({
    include: { student: true, category: true }
  });
  console.log('Total Creative Hub Submissions in DB:', chSubmissions.length);
  if (chSubmissions.length > 0) {
    console.log('Sample submission:', chSubmissions[0]);
  }

  const lbAll = await calculateAllLeaderboards({});
  console.log('Overall Leaderboard top 3:', lbAll.slice(0, 3).map(s => ({ name: s.name, spr: s.spr, catPoints: s.categoryPoints })));

  if (chCat) {
    const lbCHById = await calculateAllLeaderboards({ categoryId: chCat.id });
    console.log('Leaderboard filtered by categoryId (ID): count =', lbCHById.length);
    if (lbCHById.length > 0) console.log('Top CH by ID:', lbCHById.slice(0, 5).map(s => ({ name: s.name, spr: s.spr, records: s.recordsCount })));

    const lbCHByCode = await calculateAllLeaderboards({ categoryId: 'CREATIVE_HUB' });
    console.log('Leaderboard filtered by categoryId (CODE): count =', lbCHByCode.length);
    if (lbCHByCode.length > 0) console.log('Top CH by CODE:', lbCHByCode.slice(0, 5).map(s => ({ name: s.name, spr: s.spr, records: s.recordsCount })));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
