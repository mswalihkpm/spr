const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const cats = await prisma.category.findMany({
    include: { subcategories: true }
  });
  console.log('Categories count:', cats.length);
  cats.forEach(c => {
    console.log(`Category: [${c.id}] (code: ${c.code}) "${c.name}" -> Subcategories (${c.subcategories.length}):`);
    c.subcategories.forEach(s => console.log(`   -> [${s.id}] (code: ${s.code}) "${s.name}"`));
  });
}

run().then(() => prisma.$disconnect());
