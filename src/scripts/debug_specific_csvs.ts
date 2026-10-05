import fs from 'fs';
import path from 'path';
import { parseCSV } from './validate_csv_exports';

const csvDir = path.join(process.cwd(), 'backups', 'csv');
console.log('AcademicClass.csv:', parseCSV(fs.readFileSync(path.join(csvDir, 'AcademicClass.csv'), 'utf-8')));
console.log('Level.csv:', parseCSV(fs.readFileSync(path.join(csvDir, 'Level.csv'), 'utf-8')));
console.log('Category.csv:', parseCSV(fs.readFileSync(path.join(csvDir, 'Category.csv'), 'utf-8')));
console.log('AcademicInstitution.csv exists?', fs.existsSync(path.join(csvDir, 'AcademicInstitution.csv')));
