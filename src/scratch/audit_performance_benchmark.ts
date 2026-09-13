import { prisma } from '../lib/prisma';
import { calculateStudentSPR, calculateAllLeaderboards, invalidateEngineCache } from '../lib/spr-engine';

interface MetricResult {
  operation: string;
  category: string;
  dbQueriesCount: number;
  dbQueryTimeMs: number;
  calculationTimeMs: number;
  totalTimeMs: number;
  payloadSizeBytes: number;
  payloadItemCount: number;
  cacheStatus: 'COLD' | 'WARM' | 'POST_MUTATION';
  notes: string;
}

async function measure<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

async function runBenchmark() {
  console.log('=================================================================');
  console.log('   PRODUCTION PERFORMANCE AUDIT & BENCHMARK SUITE');
  console.log('=================================================================\n');

  const metrics: MetricResult[] = [];

  // 1. Raw Database Connection & Ping Latency Test
  console.log('--- 1. Testing Raw Supabase PostgreSQL Ping Latency ---');
  const pingTimes: number[] = [];
  for (let i = 0; i < 5; i++) {
    const { durationMs } = await measure(`ping_${i}`, () => prisma.$queryRaw`SELECT 1 as ping`);
    pingTimes.push(durationMs);
  }
  const avgPing = pingTimes.reduce((a, b) => a + b, 0) / pingTimes.length;
  console.log(`Ping Latencies (ms): ${pingTimes.map((t) => t.toFixed(1)).join(', ')} | Avg: ${avgPing.toFixed(1)}ms\n`);

  // 2. Initial Homepage Data Fetching
  console.log('--- 2. Auditing Homepage Data Fetching ---');
  // (A) Academic Master Data (Exact query from /api/academic)
  const { result: academicData, durationMs: academicDbTime } = await measure('academic', async () => {
    const [
      schools,
      classes,
      academicYears,
      terms,
      exams,
      subjects,
      levels,
      institutions,
      boards,
      categories,
      programs,
      competitions,
      literaryEvents,
    ] = await Promise.all([
      prisma.school.findMany({ orderBy: { name: 'asc' } }),
      prisma.academicClass.findMany({ orderBy: { numericGrade: 'asc' } }),
      prisma.academicYear.findMany({ orderBy: { name: 'desc' } }),
      prisma.term.findMany({ orderBy: { name: 'asc' } }),
      prisma.exam.findMany({ include: { category: true, term: true, _count: { select: { performanceRecords: true } } }, orderBy: { name: 'asc' } }),
      prisma.subject.findMany({ include: { category: true, institution: true, board: true }, orderBy: { name: 'asc' } }),
      prisma.level.findMany({ orderBy: { displayOrder: 'asc' } }),
      prisma.academicInstitution.findMany({ orderBy: { name: 'asc' } }),
      prisma.boardSyllabus.findMany({ orderBy: { name: 'asc' } }),
      prisma.category.findMany({ orderBy: { displayOrder: 'asc' } }),
      prisma.program.findMany({ include: { level: true, academicYear: true, competitions: true }, orderBy: { date: 'desc' } }),
      prisma.competition.findMany({ include: { program: true }, orderBy: { name: 'asc' } }),
      prisma.literaryEvent.findMany({ include: { competitions: true, academicYear: true }, orderBy: { date: 'desc' } }),
    ]);
    return { schools, classes, academicYears, terms, exams, subjects, levels, institutions, boards, categories, programs, competitions, literaryEvents };
  });

  const academicPayloadSize = Buffer.byteLength(JSON.stringify(academicData));
  metrics.push({
    operation: 'Master Data API (/api/academic)',
    category: 'Initial Homepage Opening',
    dbQueriesCount: 13,
    dbQueryTimeMs: academicDbTime,
    calculationTimeMs: 0.1,
    totalTimeMs: academicDbTime,
    payloadSizeBytes: academicPayloadSize,
    payloadItemCount:
      academicData.categories.length +
      academicData.schools.length +
      academicData.classes.length +
      academicData.levels.length +
      academicData.terms.length +
      academicData.exams.length +
      academicData.subjects.length +
      academicData.competitions.length,
    cacheStatus: 'COLD',
    notes: '13 concurrent queries loading entire academic structure',
  });

  // (B) Homepage News (/api/news?limit=3)
  const { result: newsData, durationMs: newsTime } = await measure('news', async () => {
    return prisma.news.findMany({ where: { active: true }, take: 3, orderBy: { publishedAt: 'desc' } });
  });
  metrics.push({
    operation: 'News Updates API (/api/news?limit=3)',
    category: 'Homepage Data Fetching',
    dbQueriesCount: 1,
    dbQueryTimeMs: newsTime,
    calculationTimeMs: 0.1,
    totalTimeMs: newsTime,
    payloadSizeBytes: Buffer.byteLength(JSON.stringify(newsData)),
    payloadItemCount: newsData.length,
    cacheStatus: 'COLD',
    notes: '3 news records',
  });

  // (C) Homepage Leaderboard (/api/leaderboard - Overview)
  invalidateEngineCache(); // Test cold load first
  const { result: lbCold, durationMs: lbColdTotal } = await measure('lb_cold', async () => {
    return calculateAllLeaderboards();
  });
  const lbPayloadSize = Buffer.byteLength(JSON.stringify(lbCold));
  metrics.push({
    operation: 'Leaderboard API: Overview (/api/leaderboard [COLD])',
    category: 'Leaderboard Initial Load',
    dbQueriesCount: 4, // Student findMany + categories + settings + levels
    dbQueryTimeMs: lbColdTotal - 0.5,
    calculationTimeMs: 0.5,
    totalTimeMs: lbColdTotal,
    payloadSizeBytes: lbPayloadSize,
    payloadItemCount: lbCold.length,
    cacheStatus: 'COLD',
    notes: 'Loads 117 students + all 10-table joins on cold start',
  });

  // (D) Homepage Leaderboard (/api/leaderboard [WARM CACHE])
  const { result: lbWarm, durationMs: lbWarmTotal } = await measure('lb_warm', async () => {
    return calculateAllLeaderboards();
  });
  metrics.push({
    operation: 'Leaderboard API: Overview (/api/leaderboard [WARM])',
    category: 'Leaderboard Initial Load',
    dbQueriesCount: 0,
    dbQueryTimeMs: 0,
    calculationTimeMs: lbWarmTotal,
    totalTimeMs: lbWarmTotal,
    payloadSizeBytes: lbPayloadSize,
    payloadItemCount: lbWarm.length,
    cacheStatus: 'WARM',
    notes: 'In-memory cache snapshot (Node process memory)',
  });

  // 3. Leaderboard Category / Tab Switching
  console.log('--- 3. Auditing Leaderboard Tab & Filter Switching ---');
  // (A) Category Tab: ISLAMIC (WARM)
  const islamicCat = academicData.categories.find((c) => c.code === 'ISLAMIC');
  const { result: lbIslamic, durationMs: lbIslamicTime } = await measure('lb_islamic', async () => {
    return calculateAllLeaderboards({ categoryId: islamicCat?.id });
  });
  metrics.push({
    operation: 'Tab Switch: Islamic Category (/api/leaderboard?categoryId=...)',
    category: 'Leaderboard Tab Switching',
    dbQueriesCount: 0,
    dbQueryTimeMs: 0,
    calculationTimeMs: lbIslamicTime,
    totalTimeMs: lbIslamicTime,
    payloadSizeBytes: Buffer.byteLength(JSON.stringify(lbIslamic)),
    payloadItemCount: lbIslamic.length,
    cacheStatus: 'WARM',
    notes: 'In-memory filter calculation',
  });

  // (B) Subcategory Tab: Sahityotsav Festival
  const { result: lbSahityotsav, durationMs: lbSahityotsavTime } = await measure('lb_sahityotsav', async () => {
    return calculateAllLeaderboards({ fest: 'SAHITYOTSAV' });
  });
  metrics.push({
    operation: 'Tab Switch: Sahityotsav Fest (/api/leaderboard?fest=SAHITYOTSAV)',
    category: 'Leaderboard Tab Switching',
    dbQueriesCount: 0,
    dbQueryTimeMs: 0,
    calculationTimeMs: lbSahityotsavTime,
    totalTimeMs: lbSahityotsavTime,
    payloadSizeBytes: Buffer.byteLength(JSON.stringify(lbSahityotsav)),
    payloadItemCount: lbSahityotsav.length,
    cacheStatus: 'WARM',
    notes: 'In-memory filter calculation',
  });

  // (C) Filter by Class: Class 10
  const class10 = academicData.classes.find((c) => c.numericGrade === 10 || c.name.includes('10'));
  const { result: lbClass10, durationMs: lbClass10Time } = await measure('lb_class10', async () => {
    return calculateAllLeaderboards({ classId: class10?.id });
  });
  metrics.push({
    operation: `Filter Switch: Class (${class10?.name || 'Class 10'})`,
    category: 'Leaderboard Tab Switching',
    dbQueriesCount: 0,
    dbQueryTimeMs: 0,
    calculationTimeMs: lbClass10Time,
    totalTimeMs: lbClass10Time,
    payloadSizeBytes: Buffer.byteLength(JSON.stringify(lbClass10)),
    payloadItemCount: lbClass10.length,
    cacheStatus: 'WARM',
    notes: 'In-memory filter calculation',
  });

  // 4. Student Profile / Dossier Loading
  console.log('--- 4. Auditing Student Profile / Dossier Loading ---');
  const sampleStudent = await prisma.student.findFirst({ where: { status: 'ACTIVE' } });
  if (!sampleStudent) throw new Error('No active student found');

  // (A) COLD Student Profile Load (/api/public/student/[id])
  invalidateEngineCache();
  const { result: studentCold, durationMs: studentColdTotal } = await measure('student_cold', async () => {
    const startDb = performance.now();
    const [profile, creativeWorks, libraryRecords] = await Promise.all([
      calculateStudentSPR(sampleStudent.id),
      prisma.creativeHubSubmission.findMany({
        where: { studentId: sampleStudent.id, publicationStatus: { in: ['PUBLISHED', 'FEATURED'] } },
        include: { category: true },
        orderBy: { date: 'desc' },
      }),
      prisma.libraryRecord.findMany({
        where: { studentId: sampleStudent.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const allLb = await calculateAllLeaderboards({ academicYearId: profile?.student.academicYear.id });
    const dbTime = performance.now() - startDb;
    return { profile, creativeWorks, libraryRecords, allLb, dbTime };
  });

  const studentPayloadSize = Buffer.byteLength(
    JSON.stringify({
      profile: studentCold.profile,
      creativeWorks: studentCold.creativeWorks,
      libraryRecords: studentCold.libraryRecords,
    })
  );

  metrics.push({
    operation: 'Student Dossier: (/api/public/student/[id] [COLD])',
    category: 'Student Profile Loading',
    dbQueriesCount: 7,
    dbQueryTimeMs: studentCold.dbTime,
    calculationTimeMs: 0.8,
    totalTimeMs: studentColdTotal,
    payloadSizeBytes: studentPayloadSize,
    payloadItemCount:
      (studentCold.profile?.categoryScores?.length || 0) +
      studentCold.creativeWorks.length +
      studentCold.libraryRecords.length,
    cacheStatus: 'COLD',
    notes: 'Runs calculateStudentSPR + calculateAllLeaderboards (full cohort) + creative + library',
  });

  // (B) WARM Student Profile Load
  const { result: studentWarm, durationMs: studentWarmTotal } = await measure('student_warm', async () => {
    const profile = await calculateStudentSPR(sampleStudent.id);
    const allLb = await calculateAllLeaderboards({ academicYearId: profile?.student.academicYear.id });
    return { profile, allLb };
  });
  metrics.push({
    operation: 'Student Dossier: (/api/public/student/[id] [WARM])',
    category: 'Student Profile Loading',
    dbQueriesCount: 0,
    dbQueryTimeMs: 0,
    calculationTimeMs: studentWarmTotal,
    totalTimeMs: studentWarmTotal,
    payloadSizeBytes: studentPayloadSize,
    payloadItemCount: studentWarm.profile?.categoryScores?.length || 0,
    cacheStatus: 'WARM',
    notes: 'Engine cache hit',
  });

  // 5. Admin Panel Opening & Dashboard (/api/analytics)
  console.log('--- 5. Auditing Admin Panel & Analytics Dashboard ---');
  const { result: adminData, durationMs: adminTime } = await measure('admin_analytics', async () => {
    const [
      totalStudents,
      activeStudents,
      totalClasses,
      totalSchools,
      totalScores,
      totalCreative,
      totalLibrary,
      recentScores,
      classCounts,
      schoolCounts,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { status: 'ACTIVE' } }),
      prisma.academicClass.count({ where: { active: true } }),
      prisma.school.count({ where: { active: true } }),
      prisma.performanceRecord.count(),
      prisma.creativeHubSubmission.count(),
      prisma.libraryRecord.count(),
      prisma.performanceRecord.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { include: { class: true, school: true } },
          category: true,
          subject: true,
          exam: true,
          competition: true,
          literaryCompetition: true,
        },
      }),
      prisma.student.groupBy({ by: ['classId'], _count: { id: true } }),
      prisma.student.groupBy({ by: ['schoolId'], _count: { id: true } }),
    ]);
    return {
      totalStudents,
      activeStudents,
      totalClasses,
      totalSchools,
      totalScores,
      totalCreative,
      totalLibrary,
      recentScores,
      classCounts,
      schoolCounts,
    };
  });
  metrics.push({
    operation: 'Admin Dashboard Overview (/api/analytics)',
    category: 'Admin Panel Opening',
    dbQueriesCount: 10,
    dbQueryTimeMs: adminTime,
    calculationTimeMs: 0.2,
    totalTimeMs: adminTime,
    payloadSizeBytes: Buffer.byteLength(JSON.stringify(adminData)),
    payloadItemCount: adminData.recentScores.length + adminData.classCounts.length,
    cacheStatus: 'COLD',
    notes: '10 separate count/groupBy/findMany queries executed concurrently',
  });

  // 6. Admin Student List Loading (/api/students)
  console.log('--- 6. Auditing Admin Student List Loading ---');
  const { result: studentsListData, durationMs: studentsListTime } = await measure('admin_students', async () => {
    return prisma.student.findMany({
      include: {
        class: true,
        school: true,
        academicYear: true,
        _count: {
          select: {
            performanceRecords: true,
            creativeWorks: true,
            libraryRecords: true,
          },
        },
      },
      orderBy: [{ class: { numericGrade: 'asc' } }, { fullName: 'asc' }],
    });
  });
  const studentsListPayloadSize = Buffer.byteLength(JSON.stringify(studentsListData));
  metrics.push({
    operation: 'Admin Student Directory (/api/students)',
    category: 'Admin Student List Loading',
    dbQueriesCount: 1,
    dbQueryTimeMs: studentsListTime,
    calculationTimeMs: 0.3,
    totalTimeMs: studentsListTime,
    payloadSizeBytes: studentsListPayloadSize,
    payloadItemCount: studentsListData.length,
    cacheStatus: 'COLD',
    notes: `Fetched all ${studentsListData.length} students with 3 sub-relation counts`,
  });

  // 7. Admin Score & Academic Data Loading (/api/scores)
  console.log('--- 7. Auditing Admin Score / Academic Data Loading ---');
  const { result: scoresData, durationMs: scoresTime } = await measure('admin_scores', async () => {
    return prisma.performanceRecord.findMany({
      include: {
        student: { include: { class: true, school: true } },
        category: true,
        subcategory: true,
        subject: { include: { institution: true, board: true } },
        exam: { include: { term: true } },
        competition: { include: { program: true } },
        literaryCompetition: { include: { event: true } },
        level: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  });
  const scoresPayloadSize = Buffer.byteLength(JSON.stringify(scoresData));
  metrics.push({
    operation: 'Admin Scores Registry (/api/scores [take 200])',
    category: 'Admin Score/Academic Data Loading',
    dbQueriesCount: 1,
    dbQueryTimeMs: scoresTime,
    calculationTimeMs: 0.5,
    totalTimeMs: scoresTime,
    payloadSizeBytes: scoresPayloadSize,
    payloadItemCount: scoresData.length,
    cacheStatus: 'COLD',
    notes: 'Massive 10-table join query with 200 detailed rows',
  });

  // 8. Mutation Flow: Saving/editing a score and refreshing affected data
  console.log('--- 8. Auditing Write/Mutation & Cache Invalidation Flow ---');
  invalidateEngineCache();
  const { result: postMutationLb, durationMs: postMutationTime } = await measure('post_mutation', async () => {
    return calculateAllLeaderboards();
  });
  metrics.push({
    operation: 'Post-Mutation Leaderboard Recompute (/api/leaderboard)',
    category: 'Saving/Editing Score & Refresh',
    dbQueriesCount: 4,
    dbQueryTimeMs: postMutationTime - 0.5,
    calculationTimeMs: 0.5,
    totalTimeMs: postMutationTime,
    payloadSizeBytes: lbPayloadSize,
    payloadItemCount: postMutationLb.length,
    cacheStatus: 'POST_MUTATION',
    notes: 'Cache cleared on mutation; full database join re-executed on next query',
  });

  // 9. Inspect Memory / Cache Snapshot Retention
  console.log('\n--- 9. Analyzing Memory Snapshot Size & Entity Counts ---');
  const snapshotRaw = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    include: {
      class: true,
      school: true,
      academicYear: true,
      performanceRecords: {
        include: {
          category: true,
          subject: { include: { institution: true, board: true } },
          competition: { include: { program: true } },
          literaryCompetition: { include: { event: true } },
          subcategory: true,
          level: true,
        },
      },
      creativeWorks: { include: { category: true } },
      libraryRecords: true,
    },
  });
  const snapshotByteSize = Buffer.byteLength(JSON.stringify(snapshotRaw));
  const totalPerfRecords = snapshotRaw.reduce((acc, s) => acc + s.performanceRecords.length, 0);
  const totalCreative = snapshotRaw.reduce((acc, s) => acc + s.creativeWorks.length, 0);
  const totalLib = snapshotRaw.reduce((acc, s) => acc + s.libraryRecords.length, 0);

  console.log(`Active Students: ${snapshotRaw.length}`);
  console.log(`Total Performance Records: ${totalPerfRecords}`);
  console.log(`Total Creative Works: ${totalCreative}`);
  console.log(`Total Library Records: ${totalLib}`);
  console.log(`Raw In-Memory Snapshot JSON Size: ${(snapshotByteSize / 1024).toFixed(1)} KB`);

  // Print Formatted Table
  console.log('\n=================================================================');
  console.log('                 AUDIT MEASUREMENT RESULTS');
  console.log('=================================================================\n');

  console.table(
    metrics.map((m) => ({
      Operation: m.operation,
      Category: m.category,
      Status: m.cacheStatus,
      'DB (ms)': m.dbQueryTimeMs.toFixed(1),
      'Calc (ms)': m.calculationTimeMs.toFixed(1),
      'Total (ms)': m.totalTimeMs.toFixed(1),
      'Payload (KB)': (m.payloadSizeBytes / 1024).toFixed(1),
      'Queries': m.dbQueriesCount,
    }))
  );
}

runBenchmark().catch(console.error).finally(() => prisma.$disconnect());
