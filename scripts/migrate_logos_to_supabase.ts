import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import { getSupabaseAdminClient } from '../src/lib/supabase-storage';

interface ManifestItem {
  id: string;
  code: string;
  name: string;
  mimeType: string;
  originalLengthChars: number;
  fileSizeBytes: number;
  backupFile: string;
  fullLocalPath: string;
}

interface MigrationResult {
  code: string;
  name: string;
  subcategoryId: string;
  storagePath: string;
  publicUrl: string;
  uploadStatus: 'SUCCESS' | 'FAILED';
  verificationStatus: 'VERIFIED' | 'FAILED';
  httpStatus?: number;
  contentType?: string;
  bytesReceived?: number;
  dbUpdated: boolean;
  previousLogoLength: number;
  newLogoUrl: string;
  error?: string;
}

// Category folder mappings
const CATEGORY_FOLDERS: Record<string, string> = {
  KUTHBKHANA: 'library',
  MEEM_22BA: 'qualification',
  SHASTRAMELA_GJ2Z: 'literary',
  JAMIATHUL_HIND: 'islamic',
  SHEIKH_ABUBAKR_FOUND_45F3: 'qualification',
};

const FILE_NAMES: Record<string, string> = {
  KUTHBKHANA: 'kuthbkhana.png',
  MEEM_22BA: 'meem.png',
  SHASTRAMELA_GJ2Z: 'shastramela.png',
  JAMIATHUL_HIND: 'jamiathul_hind.png',
  SHEIKH_ABUBAKR_FOUND_45F3: 'sheikh_abubakr_foundation.png',
};

async function migrateLogos() {
  console.log('====================================================');
  console.log('SPR — LOGO MIGRATION TO SUPABASE STORAGE');
  console.log('====================================================\n');

  const supabase = getSupabaseAdminClient();
  const manifestPath = path.join(process.cwd(), 'scripts', 'backup_logos', 'backup_manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found at ${manifestPath}`);
  }

  const manifest: ManifestItem[] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`Loaded ${manifest.length} items from backup manifest.\n`);

  // Ensure 'logos' bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const hasLogosBucket = buckets?.some(b => b.name === 'logos');
  if (!hasLogosBucket) {
    console.log("Creating 'logos' public bucket...");
    const { error: bErr } = await supabase.storage.createBucket('logos', { public: true });
    if (bErr) throw new Error(`Failed to create logos bucket: ${bErr.message}`);
  }

  const results: MigrationResult[] = [];
  const logDir = path.join(process.cwd(), 'scripts', 'migration_logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  for (const item of manifest) {
    console.log(`----------------------------------------------------`);
    console.log(`Processing [${item.code}] "${item.name}"...`);

    const categoryFolder = CATEGORY_FOLDERS[item.code] || 'general';
    const filename = FILE_NAMES[item.code] || `${item.code.toLowerCase()}.png`;
    const storagePath = `subcategories/${categoryFolder}/${filename}`;

    const filePath = path.join(process.cwd(), 'scripts', 'backup_logos', item.backupFile);
    if (!fs.existsSync(filePath)) {
      console.error(`ERROR: Backup file ${filePath} does not exist! Skipping.`);
      results.push({
        code: item.code,
        name: item.name,
        subcategoryId: item.id,
        storagePath,
        publicUrl: '',
        uploadStatus: 'FAILED',
        verificationStatus: 'FAILED',
        dbUpdated: false,
        previousLogoLength: item.originalLengthChars,
        newLogoUrl: '',
        error: `File ${filePath} not found`,
      });
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    console.log(`Read ${fileBuffer.length} bytes from ${item.backupFile}`);

    // 1. Upload to Supabase Storage
    console.log(`Uploading to Supabase Storage (bucket: 'logos', path: '${storagePath}')...`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('logos')
      .upload(storagePath, fileBuffer, {
        contentType: item.mimeType || 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error(`Upload error: ${uploadError.message}`);
      results.push({
        code: item.code,
        name: item.name,
        subcategoryId: item.id,
        storagePath,
        publicUrl: '',
        uploadStatus: 'FAILED',
        verificationStatus: 'FAILED',
        dbUpdated: false,
        previousLogoLength: item.originalLengthChars,
        newLogoUrl: '',
        error: uploadError.message,
      });
      continue;
    }

    // 2. Generate permanent public URL
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(storagePath);
    console.log(`Generated public URL: ${publicUrl}`);

    // 3. Verify public URL via HTTP GET
    console.log(`Verifying image download via HTTP GET...`);
    let isVerified = false;
    let httpStatus = 0;
    let contentType = '';
    let bytesReceived = 0;

    try {
      const res = await fetch(publicUrl, { method: 'GET' });
      httpStatus = res.status;
      contentType = res.headers.get('content-type') || '';
      const arrayBuffer = await res.arrayBuffer();
      bytesReceived = arrayBuffer.byteLength;

      if (httpStatus === 200 && contentType.startsWith('image/') && bytesReceived > 0) {
        isVerified = true;
        console.log(`[VERIFIED] HTTP ${httpStatus}, ${contentType}, ${bytesReceived} bytes received.`);
      } else {
        console.error(`[VERIFICATION FAILED] Status: ${httpStatus}, Type: ${contentType}, Bytes: ${bytesReceived}`);
      }
    } catch (vErr: any) {
      console.error(`Verification network error: ${vErr.message}`);
    }

    if (!isVerified) {
      console.error(`Image verification failed. Database will NOT be updated for ${item.name}.`);
      results.push({
        code: item.code,
        name: item.name,
        subcategoryId: item.id,
        storagePath,
        publicUrl,
        uploadStatus: 'SUCCESS',
        verificationStatus: 'FAILED',
        httpStatus,
        contentType,
        bytesReceived,
        dbUpdated: false,
        previousLogoLength: item.originalLengthChars,
        newLogoUrl: '',
        error: `Verification failed with HTTP ${httpStatus}`,
      });
      continue;
    }

    // 4. Update database record in PostgreSQL
    console.log(`Updating PostgreSQL record for subcategory ${item.code}...`);
    // Find subcategory by code or ID
    const subcategory = await prisma.subcategory.findFirst({
      where: {
        OR: [{ code: item.code }, { id: item.id }],
      },
      select: { id: true, code: true, name: true, logoUrl: true },
    });

    if (!subcategory) {
      console.error(`ERROR: Subcategory not found in DB with code ${item.code} or ID ${item.id}`);
      results.push({
        code: item.code,
        name: item.name,
        subcategoryId: item.id,
        storagePath,
        publicUrl,
        uploadStatus: 'SUCCESS',
        verificationStatus: 'VERIFIED',
        httpStatus,
        contentType,
        bytesReceived,
        dbUpdated: false,
        previousLogoLength: item.originalLengthChars,
        newLogoUrl: '',
        error: 'Subcategory record not found in database',
      });
      continue;
    }

    const previousLength = subcategory.logoUrl?.length || 0;
    await prisma.subcategory.update({
      where: { id: subcategory.id },
      data: { logoUrl: publicUrl },
    });

    // 5. Verify the update in PostgreSQL
    const verifiedDbRecord = await prisma.subcategory.findUnique({
      where: { id: subcategory.id },
      select: { id: true, code: true, logoUrl: true },
    });

    const dbUpdatedSuccessfully = verifiedDbRecord?.logoUrl === publicUrl;
    console.log(`PostgreSQL update confirmed: ${dbUpdatedSuccessfully ? 'SUCCESS' : 'FAILED'}`);
    console.log(`New DB logoUrl: "${verifiedDbRecord?.logoUrl}"\n`);

    results.push({
      code: item.code,
      name: item.name,
      subcategoryId: subcategory.id,
      storagePath,
      publicUrl,
      uploadStatus: 'SUCCESS',
      verificationStatus: 'VERIFIED',
      httpStatus,
      contentType,
      bytesReceived,
      dbUpdated: dbUpdatedSuccessfully,
      previousLogoLength: previousLength,
      newLogoUrl: publicUrl,
    });
  }

  // Write migration log
  const logFilePath = path.join(logDir, `migration_${Date.now()}.json`);
  fs.writeFileSync(logFilePath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`====================================================`);
  console.log(`MIGRATION FINISHED. Log saved to ${logFilePath}`);
  console.log(`Total items: ${results.length}`);
  console.log(`Successfully migrated & verified: ${results.filter(r => r.dbUpdated).length}`);
  console.log(`Failed: ${results.filter(r => !r.dbUpdated).length}`);
  console.log(`====================================================`);
}

migrateLogos().then(() => prisma.$disconnect().then(() => process.exit(0))).catch(err => {
  console.error('Fatal migration error:', err);
  prisma.$disconnect().then(() => process.exit(1));
});

