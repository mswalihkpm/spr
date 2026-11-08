import * as fs from 'fs';
import * as path from 'path';

const filePath = path.resolve(process.cwd(), 'src/lib/spr-engine.ts');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = 'const catMap = new Map(categories.map((c) => [c.id, c]));';
const endMarker = `          taskRecords: {
            where: { status: 'APPROVED' },
            select: {
              id: true,
              awardedPoints: true,
            },
          },
        },
      });`;

const startIdx = content.indexOf(startMarker);
if (startIdx === -1) {
  throw new Error('Start marker not found!');
}

// Find the end marker after startIdx
const crlfEnd = endMarker.replace(/\r?\n/g, '\r\n');
const lfEnd = endMarker.replace(/\r?\n/g, '\n');

let endIdx = content.indexOf(crlfEnd, startIdx);
let matchLen = crlfEnd.length;
if (endIdx === -1) {
  endIdx = content.indexOf(lfEnd, startIdx);
  matchLen = lfEnd.length;
}

if (endIdx === -1) {
  throw new Error('End marker not found!');
}

const replacement = `const catMap = new Map(categories.map((c) => [c.id, { id: c.id, code: c.code, name: c.name }]));
      const subMap = new Map(
        categories.flatMap((c) => c.subcategories || []).map((s: any) => [
          s.id,
          { id: s.id, code: s.code, name: s.name, weight: s.weight, maxScore: s.maxScore, categoryId: s.categoryId },
        ])
      );
      const levelMap = new Map(
        levels.map((l) => [l.id, { id: l.id, code: l.code, name: l.name, weightMultiplier: l.weightMultiplier }])
      );
      const creativeCatMap = new Map(creativeCats.map((c) => [c.id, { id: c.id, weight: c.weight }]));

      const rawStudents = await prisma.student.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          studentId: true,
          sprStudentId: true,
          fullName: true,
          division: true,
          photoUrl: true,
          classId: true,
          schoolId: true,
          academicYearId: true,
          class: { select: { name: true } },
          school: { select: { name: true } },
          performanceRecords: {
            select: {
              categoryId: true,
              subcategoryId: true,
              examId: true,
              subjectId: true,
              competitionId: true,
              literaryCompetitionId: true,
              levelId: true,
              obtainedScore: true,
              maxScore: true,
              position: true,
              remarks: true,
            },
          },
          creativeWorks: {
            select: {
              score: true,
              categoryId: true,
            },
          },
          libraryRecords: {
            select: {
              booksRead: true,
              readingScore: true,
            },
          },
          taskRecords: {
            where: { status: 'APPROVED' },
            select: {
              awardedPoints: true,
            },
          },
        },
      });`;

const isCRLF = content.includes('\r\n');
const normalizedReplacement = isCRLF ? replacement.replace(/\r?\n/g, '\r\n') : replacement.replace(/\r?\n/g, '\n');

content = content.slice(0, startIdx) + normalizedReplacement + content.slice(endIdx + matchLen);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched getActiveStudentsSnapshot in spr-engine.ts!');
