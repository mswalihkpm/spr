import { prisma } from '../src/lib/prisma';

async function measure() {
  const t0 = Date.now();
  const rawStudents = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      studentId: true,
      sprStudentId: true,
      fullName: true,
      division: true,
      status: true,
      photoUrl: true,
      classId: true,
      schoolId: true,
      academicYearId: true,
      class: { select: { id: true, name: true, numericGrade: true } },
      school: { select: { id: true, name: true, code: true } },
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      performanceRecords: {
        select: {
          id: true,
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
          id: true,
          score: true,
          title: true,
          publicationStatus: true,
          categoryId: true,
        },
      },
      libraryRecords: {
        select: {
          id: true,
          booksRead: true,
          readingScore: true,
          readingPeriod: true,
        },
      },
      taskRecords: {
        where: { status: 'APPROVED' },
        select: {
          id: true,
          awardedPoints: true,
        },
      },
    },
  });
  const tQuery = Date.now() - t0;

  const rawJson = JSON.stringify(rawStudents);
  console.log(`Students count: ${rawStudents.length}`);
  console.log(`Query time: ${tQuery} ms`);
  console.log(`Total raw JSON size: ${rawJson.length} bytes (${(rawJson.length / 1024).toFixed(2)} KB)`);

  // Breakdown of parts
  let perfRecordsCount = 0;
  let perfRecordsBytes = 0;
  let remarksBytes = 0;
  let creativeCount = 0;
  let creativeBytes = 0;
  let libraryCount = 0;
  let libraryBytes = 0;
  let taskCount = 0;
  let taskBytes = 0;

  for (const st of rawStudents) {
    perfRecordsCount += st.performanceRecords.length;
    perfRecordsBytes += JSON.stringify(st.performanceRecords).length;
    for (const r of st.performanceRecords) {
      if (r.remarks) remarksBytes += r.remarks.length;
    }
    creativeCount += st.creativeWorks.length;
    creativeBytes += JSON.stringify(st.creativeWorks).length;
    libraryCount += st.libraryRecords.length;
    libraryBytes += JSON.stringify(st.libraryRecords).length;
    taskCount += st.taskRecords.length;
    taskBytes += JSON.stringify(st.taskRecords).length;
  }

  console.log(`\nBreakdown:`);
  console.log(`- Performance records: ${perfRecordsCount} records, ${perfRecordsBytes} bytes (~${(perfRecordsBytes / 1024).toFixed(2)} KB)`);
  console.log(`  - of which 'remarks' text alone: ${remarksBytes} bytes`);
  console.log(`- Creative works: ${creativeCount} records, ${creativeBytes} bytes (~${(creativeBytes / 1024).toFixed(2)} KB)`);
  console.log(`- Library records: ${libraryCount} records, ${libraryBytes} bytes (~${(libraryBytes / 1024).toFixed(2)} KB)`);
  console.log(`- Task records: ${taskCount} records, ${taskBytes} bytes (~${(taskBytes / 1024).toFixed(2)} KB)`);
}

measure().catch(console.error).then(() => process.exit(0));

