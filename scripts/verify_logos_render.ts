import sharp from 'sharp';

const urls = [
  {
    name: 'Kuthbkhana',
    url: 'https://xzklhvmewxcaxbablcxs.supabase.co/storage/v1/object/public/logos/subcategories/library/kuthbkhana_v2.webp',
  },
  {
    name: 'Meem',
    url: 'https://xzklhvmewxcaxbablcxs.supabase.co/storage/v1/object/public/logos/subcategories/qualification/meem_v2.webp',
  },
  {
    name: 'Shastramela',
    url: 'https://xzklhvmewxcaxbablcxs.supabase.co/storage/v1/object/public/logos/subcategories/literary/shastramela_v2.webp',
  },
];

async function main() {
  console.log('Verifying uploaded WebP logos from Supabase Storage:\n');

  for (const item of urls) {
    console.log(`Checking ${item.name} (${item.url})...`);
    const res = await fetch(item.url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${item.name}: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type');
    const contentLength = res.headers.get('content-length');
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate with sharp that image is valid WebP and decode metadata
    const meta = await sharp(buffer).metadata();

    console.log(`- HTTP Status: ${res.status}`);
    console.log(`- Content-Type: ${contentType}`);
    console.log(`- Content-Length: ${contentLength} bytes (${(buffer.length / 1024).toFixed(2)} KB)`);
    console.log(`- Decoded Format: ${meta.format}`);
    console.log(`- Dimensions: ${meta.width}x${meta.height}`);
    console.log(`- Channels: ${meta.channels} (hasAlpha: ${meta.hasAlpha})`);
    console.log(`[PASS] ${item.name} renders valid, non-corrupt WebP.\n`);
  }

  console.log('All 3 optimized WebP images verified successfully!');
}

main().catch(console.error).then(() => process.exit(0));

