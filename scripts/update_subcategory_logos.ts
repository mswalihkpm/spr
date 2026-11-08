import { prisma } from '../src/lib/prisma';

const updates = [
  {
    code: 'KUTHBKHANA',
    name: 'Kuthbkhana',
    newLogoUrl: 'https://xzklhvmewxcaxbablcxs.supabase.co/storage/v1/object/public/logos/subcategories/library/kuthbkhana_v2.webp',
  },
  {
    code: 'MEEM_22BA',
    name: 'Meem',
    newLogoUrl: 'https://xzklhvmewxcaxbablcxs.supabase.co/storage/v1/object/public/logos/subcategories/qualification/meem_v2.webp',
  },
  {
    code: 'SHASTRAMELA_GJ2Z',
    name: 'Shastramela',
    newLogoUrl: 'https://xzklhvmewxcaxbablcxs.supabase.co/storage/v1/object/public/logos/subcategories/literary/shastramela_v2.webp',
  },
];

async function main() {
  console.log('Updating subcategory logo URLs in database...');

  for (const item of updates) {
    const sub = await prisma.subcategory.findFirst({
      where: { code: item.code },
    });

    if (!sub) {
      console.warn(`Subcategory with code ${item.code} not found!`);
      continue;
    }

    console.log(`Updating ${sub.name} (${sub.code})...`);
    console.log(`- Old URL: ${sub.logoUrl}`);
    console.log(`- New URL: ${item.newLogoUrl}`);

    const updated = await prisma.subcategory.update({
      where: { id: sub.id },
      data: { logoUrl: item.newLogoUrl },
    });

    console.log(`Updated successfully: ${updated.id}`);
  }

  console.log('\nVerification of updated subcategories:');
  const allUpdated = await prisma.subcategory.findMany({
    where: {
      code: { in: updates.map((u) => u.code) },
    },
    select: { name: true, code: true, logoUrl: true },
  });

  console.log(JSON.stringify(allUpdated, null, 2));
}

main().catch(console.error).then(() => process.exit(0));

