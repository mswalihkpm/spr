import { NextRequest } from 'next/server';
import { GET } from '../src/app/api/public/student/[id]/route';
import { prisma } from '../src/lib/prisma';

async function audit() {
  const student = await prisma.student.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true, studentId: true, fullName: true },
  });

  if (!student) {
    console.log('No student found in DB');
    return;
  }

  console.log(`Inspecting API output for student: ${student.fullName} (${student.studentId}, ID: ${student.id})`);

  const req = new NextRequest(`http://localhost:3000/api/public/student/${student.studentId}`);
  const res = await GET(req, { params: { id: student.studentId } });
  const data = await res.json();

  console.log('\n--- TOP-LEVEL KEYS ---');
  console.log(Object.keys(data));

  console.log('\n--- PROFILE KEYS ---');
  console.log(Object.keys(data.profile));

  console.log('\n--- PROFILE.STUDENT OBJECT ---');
  console.log(JSON.stringify(data.profile.student, null, 2));

  console.log('\n--- PROFILE RANKINGS & METRICS ---');
  const metrics: Record<string, any> = {};
  for (const k of [
    'rank', 'overallRank', 'classRank', 'schoolRank',
    'totalStudentsOverall', 'totalStudentsInClass', 'totalStudentsInSchool',
    'overallSPR', 'overallScore', 'totalPoints', 'rawWeightedTotal',
    'maxWeightedTotal', 'normalizedScore', 'missingCategoriesCount'
  ]) {
    metrics[k] = data.profile[k];
  }
  console.log(JSON.stringify(metrics, null, 2));

  console.log('\n--- CATEGORY BREAKDOWN SAMPLE (First 1) ---');
  if (data.profile.categoryBreakdown && data.profile.categoryBreakdown.length > 0) {
    console.log(JSON.stringify(data.profile.categoryBreakdown[0], null, 2));
  }

  console.log('\n--- ALL RECORDS SAMPLE (First 1) ---');
  if (data.profile.allRecords && data.profile.allRecords.length > 0) {
    console.log(JSON.stringify(data.profile.allRecords[0], null, 2));
  }

  console.log('\n--- CREATIVE WORKS SAMPLE (First 1) ---');
  if (data.creativeWorks && data.creativeWorks.length > 0) {
    console.log(JSON.stringify(data.creativeWorks[0], null, 2));
  } else {
    console.log('None present for this student');
  }

  console.log('\n--- LIBRARY RECORDS SAMPLE (First 1) ---');
  if (data.libraryRecords && data.libraryRecords.length > 0) {
    console.log(JSON.stringify(data.libraryRecords[0], null, 2));
  } else {
    console.log('None present for this student');
  }

  // Check across all active students for any sensitive fields in Student table
  const allStudents = await prisma.student.findMany({
    select: { id: true, studentId: true, notes: true, photoUrl: true }
  });
  const studentsWithNotes = allStudents.filter(s => s.notes && s.notes.trim() !== '');
  console.log(`\n--- STUDENT NOTES AUDIT ---`);
  console.log(`Total active students: ${allStudents.length}`);
  console.log(`Students with notes field populated: ${studentsWithNotes.length}`);
  if (studentsWithNotes.length > 0) {
    console.log('Sample notes:', studentsWithNotes.slice(0, 3).map(s => ({ id: s.studentId, notes: s.notes })));
  }
}

audit().catch(console.error).finally(() => process.exit(0));

