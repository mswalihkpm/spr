import fs from 'fs';
import path from 'path';

export function mergeBatchExports() {
  const backupsDir = path.join(process.cwd(), 'backups');
  const targetFile = path.join(backupsDir, 'old_database_export.json');

  const batchFiles = fs
    .readdirSync(backupsDir)
    .filter((f) => f.startsWith('batch_') && f.endsWith('.json'))
    .sort();

  if (batchFiles.length === 0) {
    console.log('No batch_*.json files found in backups directory.');
    return;
  }

  console.log(`Found ${batchFiles.length} batch files to merge:`, batchFiles);

  const mergedData: Record<string, any[]> = {};

  for (const file of batchFiles) {
    const filePath = path.join(backupsDir, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      for (const [key, value] of Object.entries(content)) {
        if (Array.isArray(value)) {
          mergedData[key] = value;
          console.log(`- Loaded table "${key}": ${value.length} records from ${file}`);
        }
      }
    } catch (err: any) {
      console.error(`Error reading ${file}:`, err.message);
    }
  }

  fs.writeFileSync(targetFile, JSON.stringify({ export_data: mergedData }, null, 2), 'utf-8');
  console.log(`\n✓ Successfully merged all batches into: ${targetFile}`);
}

if (require.main === module) {
  mergeBatchExports();
}
