import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function ensureFieldCollectionCategory() {
  console.log('Ensuring Field Collection category exists in database...');

  const ay =
    (await prisma.academicYear.findFirst({ where: { isCurrent: true } })) ||
    (await prisma.academicYear.findFirst());

  if (!ay) {
    throw new Error('No academic year found in database.');
  }

  // 1. Upsert Category
  const category = await prisma.category.upsert({
    where: { code: 'FIELD_COLLECTION' },
    create: {
      code: 'FIELD_COLLECTION',
      name: 'Field Collection',
      description: 'Field collection campaigns, student contribution milestones, and social drives',
      icon: 'coins',
      isSystem: true,
      active: true,
      displayOrder: 9,
      defaultWeight: 1.0,
      includeInSPR: true,
    },
    update: {
      name: 'Field Collection',
      description: 'Field collection campaigns, student contribution milestones, and social drives',
      icon: 'coins',
      active: true,
      displayOrder: 9,
      includeInSPR: true,
    },
  });

  console.log(`Category FIELD_COLLECTION ensured with ID: ${category.id}`);

  // 2. Upsert CategoryWeight for current academic year
  const existingWeight = await prisma.categoryWeight.findFirst({
    where: {
      categoryId: category.id,
      academicYearId: ay.id,
    },
  });

  if (!existingWeight) {
    await prisma.categoryWeight.create({
      data: {
        categoryId: category.id,
        academicYearId: ay.id,
        weight: 1.0,
        isActive: true,
        isIncludedInSPR: true,
      },
    });
    console.log(`Created CategoryWeight for academic year: ${ay.name}`);
  } else {
    await prisma.categoryWeight.update({
      where: { id: existingWeight.id },
      data: {
        isActive: true,
        isIncludedInSPR: true,
        weight: 1.0,
      },
    });
    console.log(`Updated CategoryWeight for academic year: ${ay.name}`);
  }

  // 3. Upsert default subcategory: "General Collection"
  const defaultSub = await prisma.subcategory.upsert({
    where: { id: 'field_collection_general_sub' },
    create: {
      id: 'field_collection_general_sub',
      categoryId: category.id,
      name: 'General Collection',
      code: 'GENERAL_FIELD_COLLECTION',
      logoUrl: '/field-collection-logo.png',
      hasLevels: false,
      hasMaxScore: false,
      maxScore: 100,
      weight: 1.0,
      displayOrder: 1,
      active: true,
    },
    update: {
      name: 'General Collection',
      logoUrl: '/field-collection-logo.png',
      active: true,
    },
  });

  console.log(`Default Subcategory ensured with ID: ${defaultSub.id}`);
  return { category, subcategory: defaultSub };
}

if (require.main === module) {
  ensureFieldCollectionCategory()
    .then(() => {
      console.log('✅ Field Collection initialization successful.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error initializing Field Collection category:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
