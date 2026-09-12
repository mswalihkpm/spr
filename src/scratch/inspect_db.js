const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.category.findMany({
    include: { subcategories: true }
  });
  console.log('=== CATEGORIES & SUBCATEGORIES ===');
  for (const c of cats) {
    console.log(`[${c.id}] ${c.code}: ${c.name} (defaultWeight: ${c.defaultWeight}%)`);
    for (const s of c.subcategories) {
      console.log(`   └─ [${s.id}] ${s.code}: ${s.name} (maxScore: ${s.maxScore}, weight: ${s.weight}, logoUrl: ${s.logoUrl})`);
    }
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true }
  });
  console.log('\n=== USERS ===');
  console.log(users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
