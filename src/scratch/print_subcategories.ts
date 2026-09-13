import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const lit = await prisma.category.findFirst({
    where: { code: 'LITERARY' },
    include: { subcategories: true }
  });
  console.log('Literary Subcategories:');
  lit?.subcategories.forEach((s) => {
    console.log(`- ID: ${s.id} | Name: "${s.name}" | Code: "${s.code}" | LevelGroup: "${s.levelGroup}"`);
  });

  const allCategories = await prisma.category.findMany({
    include: { subcategories: true }
  });
  console.log('\nAll Categories & Subcategories:');
  allCategories.forEach((c) => {
    console.log(`[${c.code}] ${c.name} (${c.id})`);
    c.subcategories.forEach((s) => {
      console.log(`   -> [${s.code}] ${s.name} (${s.id})`);
    });
  });
}

main().finally(() => prisma.$disconnect());
