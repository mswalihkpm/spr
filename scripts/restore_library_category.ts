import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Restoring Library & Reading category in database...');

  // 1. Update Category cmtop8rgw000s4d8smd1hxuqi to LIBRARY
  const updatedCat = await prisma.category.update({
    where: { id: 'cmtop8rgw000s4d8smd1hxuqi' },
    data: {
      code: 'LIBRARY',
      name: 'Library & Reading',
      description: 'MSOE Library & Reading logs, Imthiyaaz Library and Kuthbkhana assessments',
      icon: 'library',
      active: true,
      includeInSPR: true,
    },
  });
  console.log('Category updated:', updatedCat);

  // 2. Ensure both subcategories exist under this category
  // Imthiyaaz Library
  const imthiyaazSub = await prisma.subcategory.upsert({
    where: { id: 'cmtx_sub_lib_imthiyaaz' },
    create: {
      id: 'cmtx_sub_lib_imthiyaaz',
      categoryId: updatedCat.id,
      name: 'Imthiyaaz Library',
      code: 'LIBRARY_IMTHIYAAZ',
      hasMaxScore: true,
      maxScore: 100,
      weight: 1.0,
      displayOrder: 1,
      active: true,
    },
    update: {
      categoryId: updatedCat.id,
      name: 'Imthiyaaz Library',
      code: 'LIBRARY_IMTHIYAAZ',
      active: true,
    },
  });
  console.log('Imthiyaaz Library subcategory ensured:', imthiyaazSub.name);

  // Kuthbkhana
  const kuthbkhanaSub = await prisma.subcategory.upsert({
    where: { id: 'cmtx_sub_kuthbkhana' },
    create: {
      id: 'cmtx_sub_kuthbkhana',
      categoryId: updatedCat.id,
      name: 'Kuthbkhana',
      code: 'KUTHBKHANA',
      hasMaxScore: true,
      maxScore: 100,
      weight: 1.5,
      displayOrder: 2,
      active: true,
    },
    update: {
      categoryId: updatedCat.id,
      name: 'Kuthbkhana',
      code: 'KUTHBKHANA',
      weight: 1.5,
      active: true,
    },
  });
  console.log('Kuthbkhana subcategory ensured:', kuthbkhanaSub.name);

  console.log('Library category and subcategories restored successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
