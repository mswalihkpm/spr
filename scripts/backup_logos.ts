import * as fs from 'fs';
import * as path from 'path';

const logos = [
  {
    name: 'kuthbkhana.png',
    url: 'https://xzklhvmewxcaxbablcxs.supabase.co/storage/v1/object/public/logos/subcategories/library/kuthbkhana.png',
  },
  {
    name: 'meem.png',
    url: 'https://xzklhvmewxcaxbablcxs.supabase.co/storage/v1/object/public/logos/subcategories/qualification/meem.png',
  },
  {
    name: 'shastramela.png',
    url: 'https://xzklhvmewxcaxbablcxs.supabase.co/storage/v1/object/public/logos/subcategories/literary/shastramela.png',
  },
];

async function main() {
  const backupDir = path.resolve(process.cwd(), 'backups/original_logos');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  for (const item of logos) {
    console.log(`Downloading ${item.name} from ${item.url}...`);
    const res = await fetch(item.url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${item.url}: ${res.status} ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const dest = path.join(backupDir, item.name);
    fs.writeFileSync(dest, buffer);
    console.log(`Saved ${dest} (${buffer.length} bytes)`);
  }

  console.log('All 3 original logos successfully backed up!');
}

main().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});

