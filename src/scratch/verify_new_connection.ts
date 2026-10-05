import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env manually if needed
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const k = trimmed.slice(0, idx).trim();
      let v = trimmed.slice(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[k] = v;
    }
  }
}

async function verifyNewProject() {
  console.log('--- 1. Testing Database Connection to New Supabase Project (DIRECT_URL) ---');
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: directUrl,
      },
    },
  });

  try {
    const result = await prisma.$queryRawUnsafe('SELECT version();');
    console.log('✓ PostgreSQL Connection Successful via DIRECT_URL!');
    console.log('Database Version:', (result as any)[0]?.version?.split(' ')?.[0] || 'PostgreSQL');
  } catch (err: any) {
    console.error('✗ Database Connection Failed on DIRECT_URL:', err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n--- 2. Testing Database Connection via Transaction Pooler (DATABASE_URL) ---');
  const poolerUrl = process.env.DATABASE_URL;
  const prismaPooler = new PrismaClient({
    datasources: {
      db: {
        url: poolerUrl,
      },
    },
  });

  try {
    const result = await prismaPooler.$queryRawUnsafe('SELECT 1 as connected;');
    console.log('✓ PostgreSQL Connection Successful via DATABASE_URL (Pooler)!');
  } catch (err: any) {
    console.error('✗ Database Connection Failed on DATABASE_URL:', err.message);
  } finally {
    await prismaPooler.$disconnect();
  }

  console.log('\n--- 3. Testing Supabase Storage Connection & Bucket ---');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'student-photos';

  if (!supabaseUrl || !serviceKey) {
    console.error('✗ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('✗ Failed to list storage buckets:', listError.message);
  } else {
    console.log('Existing Buckets in New Project:', buckets.map((b) => `${b.name} (public: ${b.public})`));
    const targetBucket = buckets.find((b) => b.name === bucketName);
    if (targetBucket) {
      console.log(`✓ Storage Bucket "${bucketName}" verified (Public: ${targetBucket.public})`);
    } else {
      console.warn(`! Storage Bucket "${bucketName}" not found. Creating bucket...`);
      const { data: created, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
      });
      if (createError) {
        console.error('✗ Failed to create bucket:', createError.message);
      } else {
        console.log(`✓ Successfully created public bucket "${bucketName}".`);
      }
    }
  }
}

verifyNewProject().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
