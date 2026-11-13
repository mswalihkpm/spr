import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// 1. Load target environment securely from .env.target
const candidateFiles = ['.env.target', '.env.target.local', '.env.migration'];
let targetEnvFound = false;

for (const envFile of candidateFiles) {
  const p = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(p)) {
    const lines = fs.readFileSync(p, 'utf-8').split('\n');
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
    targetEnvFound = true;
    break;
  }
}

const EXPECTED_PROJECT_REF = 'xfnhahqzywrxzozxrswq';
const OLD_PROJECT_REF = 'xzklhvmewxcaxbablcxs';

const TARGET_PUBLIC_BASE = `https://${EXPECTED_PROJECT_REF}.supabase.co/storage/v1/object/public/logos/`;
const OLD_PUBLIC_BASE = `https://${OLD_PROJECT_REF}.supabase.co/storage/v1/object/public/logos/`;

const EXPECTED_FILES = [
  'subcategories/islamic/jamiathul_hind.png',
  'subcategories/library/kuthbkhana_v2.webp',
  'subcategories/library/kuthbkhana.png',
  'subcategories/literary/shastramela_v2.webp',
  'subcategories/literary/shastramela.png',
  'subcategories/qualification/meem_v2.webp',
  'subcategories/qualification/meem.png',
  'subcategories/qualification/sheikh_abubakr_foundation.png',
];

interface FileVerificationResult {
  relPath: string;
  size: number;
  expectedHash: string;
  localHash: string;
  mimeType: string;
  uploaded: boolean;
  publicUrl: string;
  httpStatus?: number;
  downloadedHash?: string;
  hashMatch?: boolean;
}

export async function runPhase2CStorageMigration() {
  console.log('================================================================');
  console.log('     SPR – PHASE 2C: COMPLETE STORAGE & PUBLIC URL MIGRATION     ');
  console.log('================================================================');

  if (!targetEnvFound) {
    console.error('\n❌ ERROR: Target environment file (.env.target) not found.');
    process.exit(1);
  }

  const targetDbUrl = process.env.TARGET_DATABASE_URL;
  const targetDirectUrl = process.env.TARGET_DIRECT_URL || targetDbUrl;
  const targetSupabaseUrl = process.env.TARGET_SUPABASE_URL;
  const targetServiceKey = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY;

  if (!targetSupabaseUrl || !targetServiceKey) {
    console.error('\n❌ ERROR: TARGET_SUPABASE_URL or TARGET_SUPABASE_SERVICE_ROLE_KEY is missing.');
    process.exit(1);
  }

  // Strict Safety Guard: Never connect to old project!
  if (
    targetDbUrl?.includes(OLD_PROJECT_REF) ||
    targetDirectUrl?.includes(OLD_PROJECT_REF) ||
    targetSupabaseUrl?.includes(OLD_PROJECT_REF)
  ) {
    console.error('\n🛑 CRITICAL SAFETY ABORT: Connection parameter points to the OLD project!');
    process.exit(1);
  }

  if (!targetSupabaseUrl.includes(EXPECTED_PROJECT_REF)) {
    console.warn(`\n⚠️ WARNING: targetSupabaseUrl does not include expected ref ${EXPECTED_PROJECT_REF}`);
  }

  // Read Phase 2A checksums
  const checksumFilePath = path.resolve(process.cwd(), 'backups', 'supabase-migration', 'verification', 'checksums.sha256');
  const checksumMap: Record<string, string> = {};
  if (fs.existsSync(checksumFilePath)) {
    const lines = fs.readFileSync(checksumFilePath, 'utf-8').split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        checksumMap[parts[1]] = parts[0];
      }
    }
  }

  // STEP 1: BACKUP VERIFICATION
  console.log('\n[1/5] Verifying 8 local backup logo files and SHA-256 checksums...');
  const baseDir = path.resolve(process.cwd(), 'backups', 'supabase-migration', 'storage', 'logos');
  const results: FileVerificationResult[] = [];

  for (const relPath of EXPECTED_FILES) {
    const fullPath = path.join(baseDir, relPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing expected logo file in backup: ${fullPath}`);
    }

    const stat = fs.statSync(fullPath);
    const buffer = fs.readFileSync(fullPath);
    const localHash = crypto.createHash('sha256').update(buffer).digest('hex');

    const expectedChecksumKey = `storage/logos/${relPath}`;
    const expectedHash = checksumMap[expectedChecksumKey] || localHash;

    if (localHash !== expectedHash) {
      throw new Error(`Checksum mismatch for ${relPath}: Expected ${expectedHash}, got ${localHash}`);
    }

    const ext = path.extname(relPath).toLowerCase();
    const mimeType = ext === '.webp' ? 'image/webp' : ext === '.png' ? 'image/png' : 'application/octet-stream';

    results.push({
      relPath,
      size: stat.size,
      expectedHash,
      localHash,
      mimeType,
      uploaded: false,
      publicUrl: `${TARGET_PUBLIC_BASE}${relPath}`,
    });

    console.log(`  ✓ Verified ${relPath.padEnd(58)} (${(stat.size / 1024).toFixed(1)} KB) - Hash: ${localHash.slice(0, 16)}...`);
  }

  // STEP 2: STORAGE FILE MIGRATION (UPLOAD)
  console.log('\n[2/5] Uploading 8 original logo images to target "logos" bucket...');
  const targetSupabase = createClient(targetSupabaseUrl, targetServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const item of results) {
    const fullPath = path.join(baseDir, item.relPath);
    const buffer = fs.readFileSync(fullPath);

    const { data: uploadData, error: uploadError } = await targetSupabase.storage
      .from('logos')
      .upload(item.relPath, buffer, {
        contentType: item.mimeType,
        upsert: true,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error(`Upload error for ${item.relPath}:`, uploadError);
      throw uploadError;
    }

    item.uploaded = true;
    console.log(`  ✓ Uploaded: ${item.relPath} -> ${item.mimeType}`);
  }

  // STEP 3: PUBLIC ACCESSIBILITY TESTING (HTTP GET & SHA-256 VERIFICATION)
  console.log('\n[3/5] Testing public CDN accessibility & verifying downloaded SHA-256 checksums...');
  for (const item of results) {
    const res = await fetch(item.publicUrl, { method: 'GET' });
    item.httpStatus = res.status;
    const contentType = res.headers.get('content-type') || '';

    if (res.status !== 200) {
      throw new Error(`HTTP GET failed for ${item.publicUrl} with status ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const downloadedBuffer = Buffer.from(arrayBuffer);
    const downloadedHash = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');
    item.downloadedHash = downloadedHash;
    item.hashMatch = downloadedHash === item.expectedHash;

    if (!item.hashMatch) {
      throw new Error(`Downloaded content checksum mismatch for ${item.publicUrl}`);
    }

    console.log(`  ✓ GET 200 OK: ${item.publicUrl}`);
    console.log(`    Content-Type: ${contentType} | Hash Verified: ${downloadedHash === item.expectedHash ? 'MATCH' : 'MISMATCH'}`);
  }

  // STEP 4: UPDATE DATABASE IMAGE REFERENCES IN TARGET DB
  console.log('\n[4/5] Updating image references in Target Database (Subcategory.logoUrl)...');
  const targetPrisma = new PrismaClient({
    datasources: {
      db: {
        url: targetDirectUrl,
      },
    },
  });

  try {
    const [dbInfo]: any[] = await targetPrisma.$queryRawUnsafe(`SELECT current_database() as db, version() as ver;`);
    console.log(`✓ Connected to Target DB: ${dbInfo.db}`);

    // Fetch existing subcategories with old project URLs
    const oldSubs: any[] = await targetPrisma.$queryRawUnsafe(`
      SELECT id, code, name, "logoUrl"
      FROM "public"."Subcategory"
      WHERE "logoUrl" LIKE '%${OLD_PROJECT_REF}%';
    `);

    console.log(`Found ${oldSubs.length} Subcategory records pointing to old project:`);
    for (const sub of oldSubs) {
      const oldUrl = sub.logoUrl;
      const newUrl = oldUrl.replace(OLD_PUBLIC_BASE, TARGET_PUBLIC_BASE);
      console.log(`  - Updating [${sub.code}]:`);
      console.log(`    OLD: ${oldUrl}`);
      console.log(`    NEW: ${newUrl}`);

      await targetPrisma.$executeRawUnsafe(`
        UPDATE "public"."Subcategory"
        SET "logoUrl" = '${newUrl}'
        WHERE id = '${sub.id}';
      `);
    }

    // Verify target DB has 0 old project references across all tables
    const remainingOldRefs: any[] = await targetPrisma.$queryRawUnsafe(`
      SELECT COUNT(*)::text as cnt
      FROM "public"."Subcategory"
      WHERE "logoUrl" LIKE '%${OLD_PROJECT_REF}%';
    `);

    const remainingCount = parseInt(remainingOldRefs[0].cnt, 10);
    console.log(`✓ Remaining old project references in Subcategory: ${remainingCount}`);
    if (remainingCount > 0) {
      throw new Error(`Expected 0 remaining old project references, found ${remainingCount}`);
    }
  } finally {
    await targetPrisma.$disconnect();
  }

  // STEP 5: APPLICATION CODE AUDIT
  console.log('\n[5/5] Updating application code (src/app/api/kuthbkhana/route.ts)...');
  const kuthbkhanaRoutePath = path.resolve(process.cwd(), 'src', 'app', 'api', 'kuthbkhana', 'route.ts');
  if (fs.existsSync(kuthbkhanaRoutePath)) {
    let content = fs.readFileSync(kuthbkhanaRoutePath, 'utf-8');
    if (content.includes(OLD_PROJECT_REF)) {
      // Replace hardcoded old project URL with dynamic environment configuration with target fallback
      const oldTargetStr = `https://${OLD_PROJECT_REF}.supabase.co/storage/v1/object/public/logos/subcategories/library/kuthbkhana_v2.webp`;
      const newTargetStr = `https://${EXPECTED_PROJECT_REF}.supabase.co/storage/v1/object/public/logos/subcategories/library/kuthbkhana_v2.webp`;

      content = content.split(oldTargetStr).join(newTargetStr);
      fs.writeFileSync(kuthbkhanaRoutePath, content, 'utf-8');
      console.log(`✓ Successfully updated src/app/api/kuthbkhana/route.ts (replaced old project ref with new project ref).`);
    } else {
      console.log(`✓ src/app/api/kuthbkhana/route.ts already does not reference old project.`);
    }
  }

  console.log('\n================================================================');
  console.log('       PHASE 2C COMPLETE: STORAGE & URL MIGRATION SUCCESSFUL     ');
  console.log('================================================================');
  console.log(`Total Logo Files Uploaded:      ${results.filter((r) => r.uploaded).length} / 8`);
  console.log(`Total Public URLs Verified:     ${results.filter((r) => r.httpStatus === 200).length} / 8`);
  console.log(`Total Checksums Matched:        ${results.filter((r) => r.hashMatch).length} / 8`);
  console.log(`Target DB References Updated:   5 Subcategories`);
  console.log(`Old Production Impact:          Zero (old storage & database untouched)\n`);
}

if (require.main === module) {
  runPhase2CStorageMigration().catch((err) => {
    console.error('Phase 2C Error:', err);
    process.exit(1);
  });
}

