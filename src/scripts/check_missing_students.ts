import fs from 'fs';
import { parseCSV } from './validate_csv_exports';

const backup = JSON.parse(fs.readFileSync('backups/student_photos_backup_2026-09-13T12-52-44-667Z.json', 'utf-8'));
console.log('Total students in backup:', backup.totalStudents, backup.students.length);

const studentCsv = fs.readFileSync('backups/csv/Student.csv', 'utf-8');
const csvStudents = parseCSV(studentCsv);
const csvIds = new Set(csvStudents.map((s) => s.id));
console.log('CSV student count:', csvStudents.length);

const missingFromCsv = backup.students.filter((s: any) => !csvIds.has(s.id));
console.log(`\nMissing from CSV (${missingFromCsv.length} students):`);
for (const s of missingFromCsv) {
  console.log(`- ID: ${s.id} | StudentID: ${s.studentId || s.sprStudentId} | Name: ${s.fullName} | Class: ${s.classId} | Division: ${s.division}`);
}
