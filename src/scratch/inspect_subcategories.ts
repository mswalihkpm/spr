import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const lit = await prisma.category.findFirst({
    where: { code: 'LITERARY' },
    include: { subcategories: true }
  });
  console.log('Literary Category:', lit?.name, lit?.id);
  console.log('Subcategories:', JSON.stringify(lit?.subcategories, null, 2));

  const allSubs = await prisma.subcategory.findMany();
  console.log('All subcategories count:', allSubs.length);
}

main().finally(() => prisma.$disconnect());
