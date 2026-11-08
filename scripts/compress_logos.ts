import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const files = ['kuthbkhana.png', 'meem.png', 'shastramela.png'];

async function inspectAndCompress() {
  const backupDir = path.resolve(process.cwd(), 'backups/original_logos');
  const outDir = path.resolve(process.cwd(), 'backups/compressed_webp');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const file of files) {
    const inputPath = path.join(backupDir, file);
    const meta = await sharp(inputPath).metadata();
    console.log(`\nOriginal: ${file}`);
    console.log(`- Dimensions: ${meta.width}x${meta.height}, format: ${meta.format}, channels: ${meta.channels}`);
    console.log(`- Original size: ${(fs.statSync(inputPath).size / 1024).toFixed(2)} KB`);

    // Logos are displayed in small badges/cards (max 512x512 is more than enough for crisp 2x retina display).
    // Let's resize with fit: 'inside' if width or height > 600, preserving aspect ratio and transparency.
    // Quality 85 WebP
    const webpName = file.replace('.png', '.webp');
    const outputPath = path.join(outDir, webpName);

    await sharp(inputPath)
      .resize({
        width: 600,
        height: 600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85, effort: 6 })
      .toFile(outputPath);

    const outSize = fs.statSync(outputPath).size;
    console.log(`- Compressed WebP: ${webpName}`);
    console.log(`- New size: ${(outSize / 1024).toFixed(2)} KB (${outSize} bytes)`);
    console.log(`- Reduction: ${(((fs.statSync(inputPath).size - outSize) / fs.statSync(inputPath).size) * 100).toFixed(1)}%`);
  }
}

inspectAndCompress().catch((err) => {
  console.error(err);
  process.exit(1);
});

