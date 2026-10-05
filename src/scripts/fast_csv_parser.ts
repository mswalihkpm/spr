import fs from 'fs';
import path from 'path';

export function fastParseCSV(csvText: string): Record<string, any>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let tokenStart = 0;
  let inQuotes = false;
  const len = csvText.length;
  let fieldParts: string[] = [];

  for (let i = 0; i < len; i++) {
    const code = csvText.charCodeAt(i);

    if (inQuotes) {
      if (code === 34 /* " */) {
        if (i + 1 < len && csvText.charCodeAt(i + 1) === 34) {
          fieldParts.push(csvText.slice(tokenStart, i));
          tokenStart = i + 1;
          i++; // skip escaped quote
        } else {
          inQuotes = false;
          fieldParts.push(csvText.slice(tokenStart, i));
          tokenStart = i + 1;
        }
      }
    } else {
      if (code === 34 /* " */) {
        inQuotes = true;
        tokenStart = i + 1;
      } else if (code === 44 /* , */) {
        fieldParts.push(csvText.slice(tokenStart, i));
        row.push(fieldParts.join(''));
        fieldParts = [];
        tokenStart = i + 1;
      } else if (code === 10 /* \n */ || code === 13 /* \r */) {
        fieldParts.push(csvText.slice(tokenStart, i));
        row.push(fieldParts.join(''));
        fieldParts = [];
        if (row.length > 0 && (row.length > 1 || row[0] !== '')) {
          rows.push(row);
        }
        row = [];
        if (code === 13 && i + 1 < len && csvText.charCodeAt(i + 1) === 10) {
          i++;
        }
        tokenStart = i + 1;
      }
    }
  }

  if (tokenStart < len || fieldParts.length > 0 || inQuotes) {
    fieldParts.push(csvText.slice(tokenStart));
    row.push(fieldParts.join(''));
    if (row.length > 0 && (row.length > 1 || row[0] !== '')) {
      rows.push(row);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim().replace(/^"|"$/g, ''));
  const results: Record<string, any>[] = [];

  for (let r = 1; r < rows.length; r++) {
    const rData = rows[r];
    const item: Record<string, any> = {};
    for (let c = 0; c < headers.length; c++) {
      const h = headers[c];
      let val: any = c < rData.length ? rData[c] : null;
      if (val === '' || val === 'NULL' || val === 'null' || val === undefined) {
        val = null;
      } else if (val === 'true' || val === 't' || val === 'TRUE') {
        val = true;
      } else if (val === 'false' || val === 'f' || val === 'FALSE') {
        val = false;
      }
      item[h] = val;
    }
    results.push(item);
  }

  return results;
}

if (require.main === module) {
  const t0 = Date.now();
  const subcat = fastParseCSV(fs.readFileSync('backups/csv/Subcategory.csv', 'utf-8'));
  console.log(`Subcategory.csv parsed ${subcat.length} rows in ${Date.now() - t0}ms`);
  const t1 = Date.now();
  const student = fastParseCSV(fs.readFileSync('backups/csv/Student.csv', 'utf-8'));
  console.log(`Student.csv parsed ${student.length} rows in ${Date.now() - t1}ms`);
  const t2 = Date.now();
  const perf = fastParseCSV(fs.readFileSync('backups/csv/PerformanceRecord.csv', 'utf-8'));
  console.log(`PerformanceRecord.csv parsed ${perf.length} rows in ${Date.now() - t2}ms`);
}
