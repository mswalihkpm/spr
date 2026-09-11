const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Applying new SPR Category Weights & System Defaults ---');

  const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } }) ||
    await prisma.academicYear.findFirst();

  // 1. New 7 Main Categories & Default Weights
  const categoryConfigs = [
    { code: 'ISLAMIC', name: 'Islamic Studies', defaultWeight: 40.0, displayOrder: 1, icon: 'book-open' },
    { code: 'SCHOOL', name: 'School Studies', defaultWeight: 35.0, displayOrder: 2, icon: 'graduation-cap' },
    { code: 'QUALIFICATION', name: 'Qualification', defaultWeight: 45.0, displayOrder: 3, icon: 'award' },
    { code: 'CREATIVE_HUB', name: 'Creative Hub', defaultWeight: 10.0, displayOrder: 4, icon: 'sparkles' },
    { code: 'LIBRARY', name: 'Library & Reading', defaultWeight: 12.0, displayOrder: 5, icon: 'library' },
    { code: 'LITERARY', name: 'Literary Programmes', defaultWeight: 8.0, displayOrder: 6, icon: 'feather' },
    { code: 'PROGRAMS', name: 'Programmes & Competitions', defaultWeight: 5.0, displayOrder: 7, icon: 'trophy' },
  ];

  for (const cat of categoryConfigs) {
    const existing = await prisma.category.findUnique({ where: { code: cat.code } });
    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: {
          name: cat.name,
          defaultWeight: cat.defaultWeight,
          displayOrder: cat.displayOrder,
          icon: cat.icon,
          active: true,
          includeInSPR: true,
        },
      });

      if (currentYear) {
        const existingWeight = await prisma.categoryWeight.findFirst({
          where: { categoryId: existing.id, academicYearId: currentYear.id },
        });
        if (existingWeight) {
          await prisma.categoryWeight.update({
            where: { id: existingWeight.id },
            data: {
              weight: cat.defaultWeight,
              isActive: true,
              isIncludedInSPR: true,
            },
          });
        } else {
          await prisma.categoryWeight.create({
            data: {
              categoryId: existing.id,
              academicYearId: currentYear.id,
              weight: cat.defaultWeight,
              isActive: true,
              isIncludedInSPR: true,
            },
          });
        }
      }
      console.log(`Updated Category: ${cat.name} (${cat.code}) -> Weight: ${cat.defaultWeight}, Priority: ${cat.displayOrder}`);
    }
  }

  // 2. Festival & Competition Levels & Multipliers
  const levelConfigs = [
    { code: 'CAMPUS', name: 'Campus', multiplier: 1.0, order: 1 },
    { code: 'SCHOOL', name: 'School', multiplier: 1.0, order: 2 },
    { code: 'DIVISION', name: 'Division', multiplier: 2.0, order: 3 },
    { code: 'SUB_DISTRICT', name: 'Sub-district', multiplier: 2.0, order: 4 },
    { code: 'DISTRICT', name: 'District', multiplier: 2.5, order: 5 },
    { code: 'KULLIYA', name: 'Kulliya', multiplier: 2.0, order: 6 },
    { code: 'DAAERA', name: "Da'eera", multiplier: 3.0, order: 7 },
    { code: 'STATE', name: 'State', multiplier: 4.0, order: 8 },
    { code: 'JAMIA', name: 'Jamia', multiplier: 4.0, order: 9 },
    { code: 'NATIONAL', name: 'National', multiplier: 4.5, order: 10 },
    { code: 'INTERNATIONAL', name: 'International', multiplier: 5.0, order: 11 },
  ];

  for (const lvl of levelConfigs) {
    const existing = await prisma.level.findFirst({
      where: {
        OR: [{ code: lvl.code }, { name: { equals: lvl.name, mode: 'insensitive' } }],
      },
    });
    if (existing) {
      await prisma.level.update({
        where: { id: existing.id },
        data: {
          name: lvl.name,
          weightMultiplier: lvl.multiplier,
          displayOrder: lvl.order,
          active: true,
        },
      });
      console.log(`Updated Level: ${lvl.name} (${lvl.code}) -> Multiplier: ${lvl.multiplier}x, Order: ${lvl.order}`);
    } else {
      await prisma.level.create({
        data: {
          code: lvl.code,
          name: lvl.name,
          weightMultiplier: lvl.multiplier,
          displayOrder: lvl.order,
          active: true,
        },
      });
      console.log(`Created Level: ${lvl.name} (${lvl.code}) -> Multiplier: ${lvl.multiplier}x, Order: ${lvl.order}`);
    }
  }

  // 3. Creative Hub Categories Priority Order
  const creativeHubDefaults = [
    { code: 'ARTICLE', name: 'Article', order: 1 },
    { code: 'RESEARCH_PAPER', name: 'Research Paper', order: 2 },
    { code: 'STORY', name: 'Story', order: 3 },
    { code: 'POEM', name: 'Poem', order: 4 },
    { code: 'RESPONSE', name: 'Response', order: 5 },
    { code: 'LETTER', name: 'Letter', order: 6 },
    { code: 'BOOK_REVIEW', name: 'Book Review', order: 7 },
    { code: 'OTHERS', name: 'Others', order: 8 },
  ];

  for (const ch of creativeHubDefaults) {
    const existing = await prisma.creativeHubCategory.findFirst({
      where: {
        OR: [{ code: ch.code }, { name: { equals: ch.name, mode: 'insensitive' } }],
      },
    });
    if (existing) {
      await prisma.creativeHubCategory.update({
        where: { id: existing.id },
        data: {
          name: ch.name,
          displayOrder: ch.order,
          active: true,
        },
      });
      console.log(`Updated Creative Hub Category: ${ch.name} (${ch.code}) -> Priority: ${ch.order}`);
    } else {
      await prisma.creativeHubCategory.create({
        data: {
          code: ch.code,
          name: ch.name,
          weight: 1.0,
          displayOrder: ch.order,
          active: true,
        },
      });
      console.log(`Created Creative Hub Category: ${ch.name} (${ch.code}) -> Priority: ${ch.order}`);
    }
  }

  // 4. System Settings for Prizes & Normalizations
  const settings = [
    { key: 'PRIZE_SCORE_1ST', value: '100', description: 'Base score for 1st Prize in Literary and Competitions' },
    { key: 'PRIZE_SCORE_2ND', value: '75', description: 'Base score for 2nd Prize in Literary and Competitions' },
    { key: 'PRIZE_SCORE_3RD', value: '50', description: 'Base score for 3rd Prize in Literary and Competitions' },
    { key: 'LIBRARY_NORMALIZATION_REF', value: '500', description: 'Reference points for Library score normalization (100% benchmark)' },
    { key: 'ACHIEVEMENT_NORMALIZATION_REF', value: '500', description: 'Reference points for Literary and Competition achievement normalization' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: { key: s.key, value: s.value, description: s.description },
    });
    console.log(`Upserted SystemSetting: ${s.key} = ${s.value}`);
  }

  console.log('--- All Category Weights, Levels, and Settings successfully configured! ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
