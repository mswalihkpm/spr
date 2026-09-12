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

  for (const s of students) {
    const schoolRecs = s.performanceRecords.filter((r) => r.category?.code === 'SCHOOL');
    if (schoolRecs.length > 0) {
      console.log(`\nStudent: ${s.fullName} (${s.sprStudentId || s.studentId}) - ${schoolRecs.length} School records:`);
      schoolRecs.forEach((r) => {
        console.log(`  - Record id: ${r.id}, subject: ${r.subject?.name || 'no subject'}, examId: ${r.examId}, examName: "${r.exam?.name || 'null'}", examMax: ${r.exam?.maxScore}, recordMax: ${r.maxScore}, obt: ${r.obtainedScore}, remarks: "${r.remarks || ''}"`);
      });
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
