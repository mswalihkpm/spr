const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function inspectSubs() {
  const subs = await p.subcategory.findMany({
    include: {
      category: true,
      _count: { select: { performanceRecords: true } }
    }
  });

  console.log('ALL SUBCATEGORIES IN DB:', subs.length);
  subs.forEach(s => {
    console.log(`- Sub: "${s.name}" under Category: "${s.category?.name}" (${s.category?.code}), records: ${s._count.performanceRecords}`);
  });
}

inspectSubs().catch(console.error).finally(() => p.$disconnect());
