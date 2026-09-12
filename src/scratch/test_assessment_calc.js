const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    include: {
      performanceRecords: {
        include: {
          category: true,
          subcategory: true,
          exam: true,
          subject: true,
        },
      },
    },
  });

  console.log('=== CALCULATING ASSESSMENT SCORES FOR STUDENTS ===');
  for (const s of students.slice(0, 10)) {
    const schoolRecs = s.performanceRecords.filter((r) => r.category?.code === 'SCHOOL');
    if (schoolRecs.length > 0) {
      const examGroups = new Map();
      schoolRecs.forEach((r) => {
        const key = (r.exam?.name || r.examId || 'General Assessment').trim().toLowerCase();
        if (!examGroups.has(key)) examGroups.set(key, []);
        examGroups.get(key).push(r);
      });

      let totalSchoolPoints = 0;
      console.log(`\nStudent: ${s.fullName} (${s.sprStudentId || s.studentId})`);
      examGroups.forEach((recs, key) => {
        const examName = recs[0]?.exam?.name || 'School Examination';
        const actualMax = recs[0]?.exam?.maxScore || 130;
        const totObt = recs.reduce((sum, r) => sum + (r.obtainedScore || 0), 0);
        const totMax = recs.reduce((sum, r) => sum + (r.maxScore || r.subject?.maxScore || 100), 0);
        const pct = totMax > 0 ? (totObt / totMax) * 100 : 0;
        const converted = Number(((pct / 100) * actualMax).toFixed(2));
        totalSchoolPoints += converted;
        console.log(`  Assessment: "${examName}" (${recs.length} subjects)`);
        console.log(`    Student Total: ${totObt}, Exam Total: ${totMax}`);
        console.log(`    Assessment %: ${pct.toFixed(2)}%`);
        console.log(`    Actual Max Mark: ${actualMax}`);
        console.log(`    Converted Single Score: ${converted} PTS (out of ${actualMax})`);
      });
      console.log(`  Total School Points: ${totalSchoolPoints.toFixed(2)} PTS`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
