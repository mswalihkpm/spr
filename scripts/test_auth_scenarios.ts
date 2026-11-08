import { NextRequest } from 'next/server';
import { GET as getStudents } from '../src/app/api/students/route';
import { POST as postScores } from '../src/app/api/scores/route';
import { GET as getStudentMe } from '../src/app/api/student/auth/me/route';
import { GET as getAdminDeletion } from '../src/app/api/admin/deletion-requests/route';
import { GET as getPublicStudent } from '../src/app/api/public/student/[id]/route';
import { prisma } from '../src/lib/prisma';

async function testAuthScenarios() {
  console.log('Testing Authentication, Authorization & Security Scenarios...\n');

  // 1. Unauthenticated request to /api/students (must 401)
  const reqStudents = new NextRequest('http://localhost:3000/api/students');
  const resStudents = await getStudents(reqStudents);
  console.log(`- Unauthenticated GET /api/students: Status = ${resStudents.status} (Expected: 401)`);
  if (resStudents.status !== 401) throw new Error('Expected 401 for /api/students');

  // 2. Unauthenticated request to mutate scores via POST /api/scores (must 401)
  const reqScores = new NextRequest('http://localhost:3000/api/scores', {
    method: 'POST',
    body: JSON.stringify({ studentId: 'test', obtainedScore: 50 }),
  });
  const resScores = await postScores(reqScores);
  console.log(`- Unauthenticated POST /api/scores: Status = ${resScores.status} (Expected: 401)`);
  if (resScores.status !== 401) throw new Error('Expected 401 for POST /api/scores');

  // 3. Unauthenticated request to /api/student/auth/me (must 401)
  const reqStudentMe = new NextRequest('http://localhost:3000/api/student/auth/me');
  const resStudentMe = await getStudentMe(reqStudentMe);
  console.log(`- Unauthenticated GET /api/student/auth/me: Status = ${resStudentMe.status} (Expected: 401)`);
  if (resStudentMe.status !== 401) throw new Error('Expected 401 for /api/student/auth/me');

  // 4. Unauthenticated request to /api/admin/deletion-requests (must 401)
  const reqDeletion = new NextRequest('http://localhost:3000/api/admin/deletion-requests');
  const resDeletion = await getAdminDeletion(reqDeletion);
  console.log(`- Unauthenticated GET /api/admin/deletion-requests: Status = ${resDeletion.status} (Expected: 401)`);
  if (resDeletion.status !== 401) throw new Error('Expected 401 for /api/admin/deletion-requests');

  // 5. Unauthenticated request to /api/public/student/[id] (must 200 OK)
  const student = await prisma.student.findFirst({ where: { status: 'ACTIVE' }, select: { studentId: true } });
  if (!student) throw new Error('No active student found');

  const reqPublic = new NextRequest(`http://localhost:3000/api/public/student/${student.studentId}`);
  const resPublic = await getPublicStudent(reqPublic, { params: { id: student.studentId } });
  console.log(`- Public GET /api/public/student/${student.studentId}: Status = ${resPublic.status} (Expected: 200)`);
  if (resPublic.status !== 200) throw new Error('Expected 200 for public student scorecard');

  console.log('\nAll authentication & authorization access control checks PASSED!');
}

testAuthScenarios().catch((err) => {
  console.error(err);
  process.exit(1);
}).then(() => process.exit(0));
