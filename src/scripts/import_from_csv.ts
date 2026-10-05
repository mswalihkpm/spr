import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { uploadBase64StudentPhoto, generateTokenizedPhotoPath } from '../lib/supabase-storage';

// Load .env
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

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

function parseCSV(csvText: string): Record<string, any>[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Simple CSV parser handling quotes
  function parseLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  }

  const headers = parseLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, ''));
  const results: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length === headers.length) {
      const row: Record<string, any> = {};
      headers.forEach((h, idx) => {
        let val: any = cols[idx];
        if (val === '' || val === 'NULL' || val === 'null') {
          val = null;
        } else if (val === 'true') {
          val = true;
        } else if (val === 'false') {
          val = false;
        }
        row[h] = val;
      });
      results.push(row);
    }
  }

  return results;
}

export async function importFromCSVDirectory() {
  const csvDir = path.join(process.cwd(), 'backups', 'csv');
  if (!fs.existsSync(csvDir)) {
    fs.mkdirSync(csvDir, { recursive: true });
    console.log(`Created directory: ${csvDir}`);
    console.log('Place your exported CSV files here (e.g. Student_rows.csv, User_rows.csv, etc.)');
    return;
  }

  const files = fs.readdirSync(csvDir).filter((f) => f.endsWith('.csv'));
  console.log(`Found ${files.length} CSV files in ${csvDir}:`, files);

  // Load each table
  const tableData: Record<string, any[]> = {};
  for (const file of files) {
    const tableName = file.replace(/_rows\.csv$|\.csv$/, '');
    const fullPath = path.join(csvDir, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const rows = parseCSV(content);
    tableData[tableName] = rows;
    console.log(`- Loaded ${rows.length} rows for table "${tableName}" from ${file}`);
  }

  // Import into database
  const { importFullDatabase } = require('./import_full_database');
  const tempJson = path.join(process.cwd(), 'backups', 'old_database_export.json');
  fs.writeFileSync(tempJson, JSON.stringify({ export_data: tableData }, null, 2), 'utf-8');
  console.log(`Saved merged CSV data to: ${tempJson}`);
  return importFullDatabase(tempJson);
}

if (require.main === module) {
  importFromCSVDirectory()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
