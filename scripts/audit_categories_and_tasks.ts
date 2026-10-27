import { prisma } from '../src/lib/prisma';

async function main() {
  const categories = await prisma.category.findMany({
    include: { categoryWeights: true }
  });
  console.log('Categories in DB:');
  for (const c of categories) {
    console.log(`- ID: ${c.id} | Code: ${c.code} | Name: "${c.name}" | Active: ${c.active} | defaultWeight: ${c.defaultWeight}`);
    for (const w of c.categoryWeights) {
      console.log(`    weight: ${w.weight}, yearId: ${w.academicYearId}, active: ${w.isActive}`);
    }
  }

  // Check if any Task models or tables exist
  console.log('\nChecking schema for task tables...');
}

main().finally(() => prisma.$disconnect());
