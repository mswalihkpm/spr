import { prisma } from '../lib/prisma';

async function inspectSubcategoryTable() {
  const rows = await prisma.subcategory.findMany();
  console.log(`Subcategory row count: ${rows.length}`);
  rows.forEach((r, idx) => {
    console.log(`Row ${idx + 1}: id=${r.id}, code=${r.code}, name=${r.name}, logoUrl length=${r.logoUrl?.length || 0}, allowedLevelIds length=${r.allowedLevelIds?.length || 0}`);
    if (r.logoUrl && r.logoUrl.startsWith('data:')) {
      console.log(`  -> WARNING: logoUrl has Base64 payload! Length: ${r.logoUrl.length} chars (~${(r.logoUrl.length / 1024).toFixed(1)} KB)`);
    }
  });

  const totalBytes = JSON.stringify(rows).length;
  console.log(`Total Subcategory JSON payload: ${(totalBytes / 1024).toFixed(2)} KB`);
}

inspectSubcategoryTable().catch(console.error).finally(() => prisma.$disconnect());
