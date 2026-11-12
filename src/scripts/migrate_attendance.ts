import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Attendance Migration & Correction ---');

  // Step 1: Correct subject name for cmtpmyah300076gmoxf9uqppc
  const targetSubject = await prisma.subject.findUnique({
    where: { id: 'cmtpmyah300076gmoxf9uqppc' }
  });

  if (targetSubject) {
    console.log(`Found subject ${targetSubject.id} with name "${targetSubject.name}". Updating to "September"...`);
    await prisma.subject.update({
      where: { id: 'cmtpmyah300076gmoxf9uqppc' },
      data: { name: 'September' }
    });
    console.log('✅ Subject name updated successfully to "September".');
  } else {
    console.log('⚠️ Subject cmtpmyah300076gmoxf9uqppc not found.');
  }

  // Step 2: Fetch all legacy attendance performance records
  const legacyRecords = await prisma.performanceRecord.findMany({
    where: {
      exam: { name: { equals: 'Attendance', mode: 'insensitive' } }
    },
    include: {
      exam: true,
      subject: true,
      student: true
    }
  });

  console.log(`Found ${legacyRecords.length} legacy attendance records in Exam "Attendance".`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const rec of legacyRecords) {
    const studentId = rec.studentId;
    const categoryCode = 'ISLAMIC';
    const calendarType = 'ENGLISH';
    const month = 9;
    const monthName = 'September';
    const year = 2026;
    const percentage = Number(rec.obtainedScore.toFixed(2));
    const points = Number(((percentage / 100) * 20).toFixed(2));

    // Upsert to MonthlyAttendance
    await prisma.monthlyAttendance.upsert({
      where: {
        studentId_categoryCode_calendarType_month_year: {
          studentId,
          categoryCode,
          calendarType,
          month,
          year
        }
      },
      create: {
        studentId,
        categoryCode,
        calendarType,
        month,
        monthName,
        year,
        percentage,
        points,
        academicYearId: rec.academicYearId || rec.student.academicYearId || null,
        createdById: rec.createdById || null
      },
      update: {
        percentage,
        points,
        monthName,
        updatedAt: new Date()
      }
    });

    migratedCount++;
  }

  console.log(`✅ Successfully processed ${migratedCount} monthly attendance records.`);

  // Step 3: Verification
  const totalMonthlyRecords = await prisma.monthlyAttendance.count();
  console.log(`Total records in MonthlyAttendance table: ${totalMonthlyRecords}`);

  const sample = await prisma.monthlyAttendance.findMany({
    take: 5,
    include: { student: { select: { fullName: true, sprStudentId: true } } }
  });
  console.log('Sample migrated monthly attendance records:');
  console.log(sample.map(s => ({
    student: s.student.fullName,
    sprId: s.student.sprStudentId,
    category: s.categoryCode,
    calendar: s.calendarType,
    month: s.monthName,
    year: s.year,
    percentage: s.percentage,
    points: s.points
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
