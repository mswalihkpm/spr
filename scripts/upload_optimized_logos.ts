import * as fs from 'fs';
import * as path from 'path';
import { getSupabaseAdminClient } from '../src/lib/supabase-storage';

const uploads = [
  {
    localFile: 'backups/compressed_webp/kuthbkhana.webp',
    storagePath: 'subcategories/library/kuthbkhana_v2.webp',
    code: 'KUTHBKHANA',
  },
  {
    localFile: 'backups/compressed_webp/meem.webp',
    storagePath: 'subcategories/qualification/meem_v2.webp',
    code: 'MEEM_22BA',
  },
  {
    localFile: 'backups/compressed_webp/shastramela.webp',
    storagePath: 'subcategories/literary/shastramela_v2.webp',
    code: 'SHASTRAMELA_GJ2Z',
  },
];

async function main() {
  const supabase = getSupabaseAdminClient();

  for (const item of uploads) {
    const fullPath = path.resolve(process.cwd(), item.localFile);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    const fileBuffer = fs.readFileSync(fullPath);
    console.log(`Uploading ${item.localFile} (${fileBuffer.length} bytes) to logos/${item.storagePath}...`);

    const { data, error } = await supabase.storage.from('logos').upload(item.storagePath, fileBuffer, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: true,
    });

    if (error) {
      throw new Error(`Upload failed for ${item.storagePath}: ${error.message}`);
    }

    console.log(`Uploaded successfully! Returned:`, data);

    const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(item.storagePath);
    console.log(`Public URL: ${publicUrlData.publicUrl}`);

    // Verify by making a HEAD/GET request to test cache-control and content-type
    const testRes = await fetch(publicUrlData.publicUrl, { method: 'HEAD' });
    console.log(`Verification status: ${testRes.status}`);
    console.log(`- content-type: ${testRes.headers.get('content-type')}`);
    console.log(`- cache-control: ${testRes.headers.get('cache-control')}`);
    console.log(`- content-length: ${testRes.headers.get('content-length')} bytes`);
  }
}

main().catch((err) => {
  console.error('Upload failed:', err);
  process.exit(1);
});

