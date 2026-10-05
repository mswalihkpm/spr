import fs from 'fs';
import path from 'path';
import { parseCSV } from './validate_csv_exports';

const csvDir = path.join(process.cwd(), 'backups', 'csv');
const subjects = parseCSV(fs.readFileSync(path.join(csvDir, 'Subject.csv'), 'utf-8'));
const instIds = new Set(subjects.map((s) => s.institutionId).filter(Boolean));
const boardIds = new Set(subjects.map((s) => s.boardId).filter(Boolean));

console.log('Distinct institutionIds referenced in Subject.csv:', Array.from(instIds));
console.log('Distinct boardIds referenced in Subject.csv:', Array.from(boardIds));
