import { calculateFastStudentRanks, calculateStudentSPR } from '../src/lib/spr-engine';
import { prisma } from '../src/lib/prisma';

async function verifyStudentScores() {
  console.log('Verifying individual student score profiles & fast ranks...');

  const sampleStudents = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    take: 10,
    select: { id: true, studentId: true, fullName: true },
  });

  for (const st of sampleStudents) {
    const profile = await calculateStudentSPR(st.id);
    const ranks = await calculateFastStudentRanks(st.id);

    if (!profile) {
      throw new Error(`Profile computation failed for student: ${st.studentId}`);
    }

    console.log(`- ${st.studentId} (${st.fullName}): Overall SPR = ${profile.overallSPR}, Rank = ${ranks.overallRank}/${ranks.totalStudentsOverall}, ClassRank = ${ranks.classRank}/${ranks.totalStudentsInClass}`);
  }

  console.log('\nAll 10 sample student dossiers calculated successfully without errors!');
}

verifyStudentScores().catch(console.error).then(() => process.exit(0));

