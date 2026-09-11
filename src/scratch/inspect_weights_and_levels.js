const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('LEVELS:', JSON.stringify(await p.level.findMany({ orderBy: { displayOrder: 'asc' } }), null, 2));
  console.log('CREATIVE_HUB_CATS:', JSON.stringify(await p.creativeHubCategory.findMany({ orderBy: { createdAt: 'asc' } }), null, 2));
  console.log('CATEGORY_WEIGHTS:', JSON.stringify(await p.categoryWeight.findMany({ include: { category: true } }), null, 2));
  console.log('SYSTEM_SETTINGS:', JSON.stringify(await p.systemSetting.findMany(), null, 2));
  console.log('SUBCATEGORIES:', JSON.stringify(await p.subcategory.findMany({ include: { category: true } }), null, 2));
  console.log('PERFORMANCE_SAMPLE_DETAIL:', JSON.stringify(await p.performanceRecord.findMany({
    take: 10,
    include: { category: true, subcategory: true, level: true, competition: true, literaryCompetition: true }
  }), null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
