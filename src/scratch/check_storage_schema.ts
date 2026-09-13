import { prisma } from '../lib/prisma';

async function checkStorageSchema() {
  console.log('--- Checking Supabase Storage in PostgreSQL Database ---');
  try {
    const buckets = await prisma.$queryRawUnsafe(`SELECT * FROM storage.buckets;`);
    console.log('Existing storage buckets in DB:', buckets);
  } catch (err: any) {
    console.log('Error querying storage.buckets:', err.message);
  }

  try {
    const objects = await prisma.$queryRawUnsafe(`SELECT count(*) FROM storage.objects;`);
    console.log('Existing storage objects count:', objects);
  } catch (err: any) {
    console.log('Error querying storage.objects:', err.message);
  }
}

checkStorageSchema().catch(console.error).finally(() => prisma.$disconnect());
