import { prisma } from '../src/lib/prisma';

async function main() {
  const objects: any = await prisma.$queryRawUnsafe(`
    SELECT id, bucket_id, name, metadata
    FROM storage.objects
    WHERE bucket_id = 'logos'
    ORDER BY created_at DESC;
  `);

  console.log('Logos in storage.objects:');
  for (const obj of objects) {
    console.log(`- name: ${obj.name}`);
    console.log(`  metadata:`, obj.metadata);
  }
}

main().catch(console.error).then(() => process.exit(0));

