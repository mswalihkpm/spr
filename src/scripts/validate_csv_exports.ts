import fs from 'fs';
import path from 'path';

// RFC-4180 compliant CSV parser
export function parseCSV(csvContent: string): Record<string, any>[] {
  const records: Record<string, any>[] = [];
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  const len = csvContent.length;

  while (i < len) {
    const char = csvContent[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < len && csvContent[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (i + 1 < len && csvContent[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  if (rows.length < 1) return [];

  const headers = rows[0].map((h) => h.trim().replace(/^"|"$/g, ''));

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 1 && row[0].trim() === '') continue; // skip trailing empty line

    const item: Record<string, any> = {};
    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];
      let val: any = c < row.length ? row[c] : null;

      if (val === '' || val === 'NULL' || val === 'null' || val === undefined) {
        val = null;
      } else if (val === 'true' || val === 't' || val === 'TRUE') {
        val = true;
      } else if (val === 'false' || val === 'f' || val === 'FALSE') {
        val = false;
      }
      item[header] = val;
    }
    records.push(item);
  }

  return records;
}

export interface ValidationSummary {
  tableName: string;
  rowCount: number;
  fileSizeBytes: number;
  headers: string[];
  status: 'VALID' | 'WARNING' | 'MISSING';
  notes: string[];
}

export async function validateAllCSVFiles(): Promise<{
  summaries: ValidationSummary[];
  totalRecords: number;
  missingTables: string[];
  fkValidationErrors: string[];
}> {
  const csvDir = path.join(process.cwd(), 'backups', 'csv');
  const allPrismaModels = [
    'User',
    'Session',
    'PasswordResetToken',
    'School',
    'AcademicClass',
    'AcademicYear',
    'Student',
    'Category',
    'Subcategory',
    'Level',
    'AcademicInstitution',
    'BoardSyllabus',
    'Term',
    'Exam',
    'Subject',
    'Program',
    'Competition',
    'CreativeHubCategory',
    'PublishedMedia',
    'CreativeHubSubmission',
    'News',
    'LiteraryEvent',
    'LiteraryCompetition',
    'LibraryIntegration',
    'LibraryRecord',
    'PerformanceRecord',
    'CategoryWeight',
    'SystemSetting',
    'AuditLog',
    'ImportHistory',
    'StudentReport',
  ];

  const csvFiles = fs.existsSync(csvDir) ? fs.readdirSync(csvDir).filter((f) => f.endsWith('.csv')) : [];
  const fileMap = new Map<string, string>();
  for (const f of csvFiles) {
    const cleanName = f.replace(/_rows\.csv$|\.csv$/, '');
    fileMap.set(cleanName.toLowerCase(), f);
  }

  const parsedData: Record<string, Record<string, any>[]> = {};
  const summaries: ValidationSummary[] = [];
  let totalRecords = 0;
  const missingTables: string[] = [];

  console.log('====================================================');
  console.log('         CSV EXPORT VALIDATION & INSPECTION         ');
  console.log('====================================================\n');

  for (const model of allPrismaModels) {
    const matchedFile = fileMap.get(model.toLowerCase());

    if (!matchedFile) {
      missingTables.push(model);
      summaries.push({
        tableName: model,
        rowCount: 0,
        fileSizeBytes: 0,
        headers: [],
        status: 'MISSING',
        notes: ['No CSV file found in backups/csv/ (Table may be empty in old DB)'],
      });
      continue;
    }

    const filePath = path.join(csvDir, matchedFile);
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(content);

    parsedData[model] = rows;
    totalRecords += rows.length;

    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const notes: string[] = [];

    if (rows.length === 0) {
      notes.push('File exists but contains 0 data rows (header only)');
    } else {
      notes.push(`Successfully parsed ${rows.length} rows`);
    }

    summaries.push({
      tableName: model,
      rowCount: rows.length,
      fileSizeBytes: stat.size,
      headers,
      status: 'VALID',
      notes,
    });
  }

  // Foreign Key / Relational Integrity Checks
  const fkValidationErrors: string[] = [];
  console.log('Checking Foreign Key and Relational Integrity...');

  // 1. Students -> AcademicClass, School, AcademicYear
  const classIds = new Set((parsedData['AcademicClass'] || []).map((c) => c.id));
  const schoolIds = new Set((parsedData['School'] || []).map((s) => s.id));
  const yearIds = new Set((parsedData['AcademicYear'] || []).map((y) => y.id));
  const studentIds = new Set((parsedData['Student'] || []).map((s) => s.id));

  for (const st of parsedData['Student'] || []) {
    if (st.classId && !classIds.has(st.classId)) {
      fkValidationErrors.push(`Student "${st.fullName}" (${st.id}) references missing classId: ${st.classId}`);
    }
    if (st.schoolId && !schoolIds.has(st.schoolId)) {
      fkValidationErrors.push(`Student "${st.fullName}" (${st.id}) references missing schoolId: ${st.schoolId}`);
    }
    if (st.academicYearId && !yearIds.has(st.academicYearId)) {
      fkValidationErrors.push(`Student "${st.fullName}" (${st.id}) references missing academicYearId: ${st.academicYearId}`);
    }
  }

  // 2. PerformanceRecords -> Student, Category, Subcategory, Exam, Subject, etc.
  const catIds = new Set((parsedData['Category'] || []).map((c) => c.id));
  const subcatIds = new Set((parsedData['Subcategory'] || []).map((s) => s.id));
  const examIds = new Set((parsedData['Exam'] || []).map((e) => e.id));
  const subjectIds = new Set((parsedData['Subject'] || []).map((s) => s.id));
  const compIds = new Set((parsedData['Competition'] || []).map((c) => c.id));
  const litCompIds = new Set((parsedData['LiteraryCompetition'] || []).map((l) => l.id));
  const levelIds = new Set((parsedData['Level'] || []).map((l) => l.id));
  const termIds = new Set((parsedData['Term'] || []).map((t) => t.id));

  for (const pr of parsedData['PerformanceRecord'] || []) {
    if (pr.studentId && !studentIds.has(pr.studentId)) {
      fkValidationErrors.push(`PerformanceRecord (${pr.id}) references missing studentId: ${pr.studentId}`);
    }
    if (pr.categoryId && !catIds.has(pr.categoryId)) {
      fkValidationErrors.push(`PerformanceRecord (${pr.id}) references missing categoryId: ${pr.categoryId}`);
    }
    if (pr.subcategoryId && !subcatIds.has(pr.subcategoryId)) {
      fkValidationErrors.push(`PerformanceRecord (${pr.id}) references missing subcategoryId: ${pr.subcategoryId}`);
    }
    if (pr.examId && !examIds.has(pr.examId)) {
      fkValidationErrors.push(`PerformanceRecord (${pr.id}) references missing examId: ${pr.examId}`);
    }
    if (pr.subjectId && !subjectIds.has(pr.subjectId)) {
      fkValidationErrors.push(`PerformanceRecord (${pr.id}) references missing subjectId: ${pr.subjectId}`);
    }
    if (pr.competitionId && !compIds.has(pr.competitionId)) {
      fkValidationErrors.push(`PerformanceRecord (${pr.id}) references missing competitionId: ${pr.competitionId}`);
    }
    if (pr.literaryCompetitionId && !litCompIds.has(pr.literaryCompetitionId)) {
      fkValidationErrors.push(`PerformanceRecord (${pr.id}) references missing literaryCompetitionId: ${pr.literaryCompetitionId}`);
    }
    if (pr.levelId && !levelIds.has(pr.levelId)) {
      fkValidationErrors.push(`PerformanceRecord (${pr.id}) references missing levelId: ${pr.levelId}`);
    }
    if (pr.termId && !termIds.has(pr.termId)) {
      fkValidationErrors.push(`PerformanceRecord (${pr.id}) references missing termId: ${pr.termId}`);
    }
    if (pr.academicYearId && !yearIds.has(pr.academicYearId)) {
      fkValidationErrors.push(`PerformanceRecord (${pr.id}) references missing academicYearId: ${pr.academicYearId}`);
    }
  }

  // 3. CreativeHubSubmission -> Student, CreativeHubCategory, PublishedMedia
  const chCatIds = new Set((parsedData['CreativeHubCategory'] || []).map((c) => c.id));
  const mediaIds = new Set((parsedData['PublishedMedia'] || []).map((m) => m.id));

  for (const ch of parsedData['CreativeHubSubmission'] || []) {
    if (ch.studentId && !studentIds.has(ch.studentId)) {
      fkValidationErrors.push(`CreativeHubSubmission (${ch.id}) references missing studentId: ${ch.studentId}`);
    }
    if (ch.categoryId && !chCatIds.has(ch.categoryId)) {
      fkValidationErrors.push(`CreativeHubSubmission (${ch.id}) references missing CreativeHubCategory: ${ch.categoryId}`);
    }
    if (ch.publishedMediaId && !mediaIds.has(ch.publishedMediaId)) {
      fkValidationErrors.push(`CreativeHubSubmission (${ch.id}) references missing PublishedMedia: ${ch.publishedMediaId}`);
    }
  }

  // 4. LibraryRecord -> Student
  for (const lr of parsedData['LibraryRecord'] || []) {
    if (lr.studentId && !studentIds.has(lr.studentId)) {
      fkValidationErrors.push(`LibraryRecord (${lr.id}) references missing studentId: ${lr.studentId}`);
    }
  }

  // Photo analysis in Student.csv
  const studentsWithPhotos = (parsedData['Student'] || []).filter(
    (s) => s.photoUrl && s.photoUrl.trim().length > 0
  );
  const base64Photos = studentsWithPhotos.filter((s) => s.photoUrl.startsWith('data:image/'));
  const httpPhotos = studentsWithPhotos.filter((s) => s.photoUrl.startsWith('http'));

  console.log('\n--- Student Photos in CSV ---');
  console.log(`Total Students:               ${(parsedData['Student'] || []).length}`);
  console.log(`Students with Photo URLs:     ${studentsWithPhotos.length}`);
  console.log(`Base64 Photos:                ${base64Photos.length}`);
  console.log(`HTTP/Storage URLs:            ${httpPhotos.length}`);

  return {
    summaries,
    totalRecords,
    missingTables,
    fkValidationErrors,
  };
}

if (require.main === module) {
  validateAllCSVFiles()
    .then((res) => {
      console.log('\n====================================================');
      console.log('              VALIDATION SUMMARY TABLE               ');
      console.log('====================================================');
      console.table(
        res.summaries.map((s) => ({
          Table: s.tableName,
          Rows: s.rowCount,
          Size: `${(s.fileSizeBytes / 1024).toFixed(1)} KB`,
          Status: s.status,
        }))
      );
      console.log(`\nTotal Records across all CSVs: ${res.totalRecords}`);
      console.log(`Missing Tables (${res.missingTables.length}):`, res.missingTables);
      console.log(`Foreign Key Errors (${res.fkValidationErrors.length}):`, res.fkValidationErrors.length === 0 ? '✓ ZERO ERRORS (100% Relational Integrity)' : res.fkValidationErrors);
    })
    .catch(console.error);
}
