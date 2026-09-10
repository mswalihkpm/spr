const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function inspectCategories() {
  const categories = await p.category.findMany({
    include: {
      subcategories: true,
      subjects: true,
      exams: true,
      _count: {
        select: {
          subcategories: true,
          subjects: true,
          exams: true,
          performanceRecords: true
        }
      }
    },
    orderBy: { displayOrder: 'asc' }
  });

  console.log('ALL CATEGORIES IN DB:');
  categories.forEach(c => {
    console.log(`- [${c.code}] ${c.name} (isSystem: ${c.isSystem}, subcategories: ${c._count.subcategories}, subjects: ${c._count.subjects}, records: ${c._count.performanceRecords})`);
    if (c.subcategories.length > 0) {
      c.subcategories.forEach(s => console.log(`   -> Sub: ${s.name} (max: ${s.maxScore}, active: ${s.active})`));
    }
  });
}

inspectCategories().catch(console.error).finally(() => p.$disconnect());
