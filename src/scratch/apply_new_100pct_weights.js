const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NEW_WEIGHTS = {
  ISLAMIC: 20.0,
  SCHOOL: 80 / 6, // 13.333333333333334
  QUALIFICATION: 80 / 6,
  CREATIVE_HUB: 80 / 6,
  LIBRARY: 80 / 6,
  LITERARY: 80 / 6,
  PROGRAMS: 80 / 6,
};

async function applyNewWeights() {
  console.log('Applying New 100% Weightage System...');

  for (const [code, weight] of Object.entries(NEW_WEIGHTS)) {
    const cat = await prisma.category.findUnique({
      where: { code },
    });

    if (cat) {
      // Update Category
      await prisma.category.update({
        where: { id: cat.id },
        data: {
          defaultWeight: weight,
          includeInSPR: true,
          active: true,
        },
      });

      // Update all CategoryWeight records for this category
      await prisma.categoryWeight.updateMany({
        where: { categoryId: cat.id },
        data: {
          weight: weight,
          isActive: true,
          isIncludedInSPR: true,
        },
      });

      console.log(`Updated ${code} -> weight: ${weight.toFixed(4)}% (exact: ${weight})`);
    }
  }

  // Update System Settings
  await prisma.systemSetting.upsert({
    where: { key: 'LIBRARY_NORMALIZATION_REF' },
    update: { value: '500' },
    create: { key: 'LIBRARY_NORMALIZATION_REF', value: '500', description: 'Points required for 100% Library score' },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'ACHIEVEMENT_NORMALIZATION_REF' },
    update: { value: '500' },
    create: { key: 'ACHIEVEMENT_NORMALIZATION_REF', value: '500', description: 'Points required for 100% Achievement score' },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'MISSING_DATA_RULE' },
    update: { value: 'INDEPENDENT_SUM' },
    create: { key: 'MISSING_DATA_RULE', value: 'INDEPENDENT_SUM', description: 'Categories contribute independently towards 100% total' },
  });

  console.log('✅ New weightage system successfully applied to database.');
}

applyNewWeights()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
