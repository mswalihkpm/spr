import fs from 'fs';
import path from 'path';
import { parseCSV } from './validate_csv_exports';

const csvDir = path.join(process.cwd(), 'backups', 'csv');
const files = fs.readdirSync(csvDir).filter((f) => f.endsWith('.csv'));

console.log('--- Inspecting CSV Samples ---');
for (const file of files) {
  const content = fs.readFileSync(path.join(csvDir, file), 'utf-8');
  const rows = parseCSV(content);
  console.log(`\nFile: ${file} | Rows: ${rows.length}`);
  if (rows.length > 0) {
    console.log('Sample Row 0:', rows[0]);
  }
}
