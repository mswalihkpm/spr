const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Kuthbkhana, Islamic subcategories, and Kuthbkhana user account...');

  // 1. Ensure Kuthbkhana user
  const email = 'kithab@gmail.com';
  const password = 'ktb123456';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'KUTHBKHANA_ADMIN',
      name: 'Kuthbkhana Admin',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
    create: {
      email,
      name: 'Kuthbkhana Admin',
      passwordHash,
      role: 'KUTHBKHANA_ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
  });
  console.log(`✓ User ${user.email} provisioned with role ${user.role}`);

  // 2. Find LIBRARY category
  let libraryCat = await prisma.category.findUnique({
    where: { code: 'LIBRARY' },
  });
  if (!libraryCat) {
    libraryCat = await prisma.category.findFirst({
      where: { name: { contains: 'Library', mode: 'insensitive' } },
    });
  }

  if (libraryCat) {
    // Subcategory 1: Imthiyaaz Library
    const imthiyaazSub = await prisma.subcategory.upsert({
      where: {
        id: 'cmtx_sub_lib_imthiyaaz',
      },
      update: {
        name: 'Imthiyaaz Library',
        code: 'LIBRARY_IMTHIYAAZ',
        logoUrl: '/library-logo.png',
        maxScore: 100,
        weight: 1.0,
        active: true,
      },
      create: {
        id: 'cmtx_sub_lib_imthiyaaz',
        categoryId: libraryCat.id,
        name: 'Imthiyaaz Library',
        code: 'LIBRARY_IMTHIYAAZ',
        logoUrl: '/library-logo.png',
        maxScore: 100,
        weight: 1.0,
        active: true,
        displayOrder: 1,
      },
    });
    console.log(`✓ Subcategory: ${imthiyaazSub.name} (${imthiyaazSub.code}) created/updated under ${libraryCat.name}`);

    // Subcategory 2: Kuthbkhana
    const kuthbkhanaSub = await prisma.subcategory.upsert({
      where: {
        id: 'cmtx_sub_kuthbkhana',
      },
      update: {
        name: 'Kuthbkhana',
        code: 'KUTHBKHANA',
        logoUrl: '/kuthbkhana-logo.png',
        maxScore: 100,
        weight: 1.0,
        active: true,
      },
      create: {
        id: 'cmtx_sub_kuthbkhana',
        categoryId: libraryCat.id,
        name: 'Kuthbkhana',
        code: 'KUTHBKHANA',
        logoUrl: '/kuthbkhana-logo.png',
        maxScore: 100,
        weight: 1.0,
        active: true,
        displayOrder: 2,
      },
    });
    console.log(`✓ Subcategory: ${kuthbkhanaSub.name} (${kuthbkhanaSub.code}) created/updated under ${libraryCat.name}`);
  }

  // 3. Find ISLAMIC category and ensure dual subcategories
  let islamicCat = await prisma.category.findUnique({
    where: { code: 'ISLAMIC' },
  });
  if (islamicCat) {
    const madinSub = await prisma.subcategory.upsert({
      where: { id: 'cmtx_sub_islamic_madin' },
      update: {
        name: "Ma'din Academy",
        code: 'MADIN_ACADEMY',
        logoUrl: '/madin-academy-dark.png',
        maxScore: 100,
        weight: 1.0,
        active: true,
      },
      create: {
        id: 'cmtx_sub_islamic_madin',
        categoryId: islamicCat.id,
        name: "Ma'din Academy",
        code: 'MADIN_ACADEMY',
        logoUrl: '/madin-academy-dark.png',
        maxScore: 100,
        weight: 1.0,
        active: true,
        displayOrder: 1,
      },
    });

    const jamiathulSub = await prisma.subcategory.upsert({
      where: { id: 'cmtx_sub_islamic_jamiathul' },
      update: {
        name: 'Jamiathul Hind Al-Islamiyya',
        code: 'JAMIATHUL_HIND',
        logoUrl: '/jamiathul-hind-calligraphy.png',
        maxScore: 100,
        weight: 1.0,
        active: true,
      },
      create: {
        id: 'cmtx_sub_islamic_jamiathul',
        categoryId: islamicCat.id,
        name: 'Jamiathul Hind Al-Islamiyya',
        code: 'JAMIATHUL_HIND',
        logoUrl: '/jamiathul-hind-calligraphy.png',
        maxScore: 100,
        weight: 1.0,
        active: true,
        displayOrder: 2,
      },
    });
    console.log(`✓ Subcategories for Islamic created/updated: ${madinSub.name}, ${jamiathulSub.name}`);
  }

  console.log('Seeding completed successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
