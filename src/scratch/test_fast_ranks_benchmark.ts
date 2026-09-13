import { prisma } from '../lib/prisma';
import {
  calculateStudentSPR,
  calculateAllLeaderboards,
  getCachedCategories,
  getCachedSettings,
  getCachedLevels,
  resolveLevelMultiplier,
  resolvePrizeMultiplier,
  resolvePrizeBaseScore,
  invalidateEngineCache,
} from '../lib/spr-engine';

function computeTiedRank(list: any[], targetId: string): number {
  const sorted = [...list].sort((a, b) => (b.spr || 0) - (a.spr || 0));
  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && (sorted[i].spr || 0) < (sorted[i - 1].spr || 0)) {
      currentRank = i + 1;
    }
    if (sorted[i].id === targetId || sorted[i].studentId === targetId) {
      return currentRank;
    }
  }
  return 1;
}

// Lightweight fast rank calculator
async function calculateFastStudentRanks(
  studentId: string,
  academicYearId?: string,
  classId?: string,
  schoolId?: string
) {
  const [categories, settings, levelsList, students] = await Promise.all([
    getCachedCategories(),
    getCachedSettings(),
    getCachedLevels(),
    prisma.student.findMany({
      where: {
        status: 'ACTIVE',
        ...(academicYearId ? { academicYearId } : {}),
      },
      select: {
        id: true,
        classId: true,
        schoolId: true,
        performanceRecords: {
          select: {
            categoryId: true,
            obtainedScore: true,
            maxScore: true,
            position: true,
            subcategory: { select: { weight: true, maxScore: true } },
            level: true,
            exam: { select: { name: true, maxScore: true } },
            subject: { select: { maxScore: true } },
          },
        },
        creativeWorks: {
          select: {
            score: true,
            category: { select: { weight: true } },
          },
        },
        libraryRecords: {
          select: {
            readingScore: true,
            booksRead: true,
          },
        },
      },
    }),
  ]);

  const parsedCategories = categories.map((cat) => {
    const activeWeightRecord = cat.categoryWeights?.find((w: any) => w.isActive !== false) || cat.categoryWeights?.[0];
    const isCatActive = activeWeightRecord?.isActive ?? cat.active;
    const isIncluded = activeWeightRecord?.isIncludedInSPR ?? cat.includeInSPR;
    return { cat, isCatActive, isIncluded };
  });

  const studentScores: { id: string; spr: number; classId: string; schoolId: string }[] = [];

  for (const st of students) {
    let totalPoints = 0;
    for (const { cat, isCatActive, isIncluded } of parsedCategories) {
      if (!isCatActive || !isIncluded) continue;

      let catEarned = 0;
      if (cat.code === 'CREATIVE_HUB') {
        st.creativeWorks.forEach((w: any) => {
          const rawScore = typeof w.score === 'number' && !isNaN(w.score)
            ? w.score
            : (typeof w.category?.weight === 'number' && w.category.weight > 0 ? w.category.weight : 20);
          catEarned += rawScore;
        });
      } else if (cat.code === 'LIBRARY') {
        st.libraryRecords.forEach((lib: any) => {
          const pts = typeof lib.readingScore === 'number' && !isNaN(lib.readingScore)
            ? lib.readingScore
            : ((lib.booksRead || 0) * 20);
          catEarned += pts;
        });
        const libPerf = st.performanceRecords.filter((r: any) => r.categoryId === cat.id);
        libPerf.forEach((r: any) => {
          const mult = typeof r.subcategory?.weight === 'number' && r.subcategory.weight > 0 ? r.subcategory.weight : 1.0;
          const base = typeof r.obtainedScore === 'number' && !isNaN(r.obtainedScore) ? r.obtainedScore : 0;
          catEarned += (base * mult);
        });
      } else if (cat.code === 'LITERARY' || cat.code === 'PROGRAMS') {
        const records = st.performanceRecords.filter((r: any) => r.categoryId === cat.id);
        records.forEach((r: any) => {
          const lvlMult = resolveLevelMultiplier(r.level, levelsList);
          const prizeMult = resolvePrizeMultiplier(r.position);
          const prizeBase = resolvePrizeBaseScore(r.position, settings);
          const baseScore = typeof r.obtainedScore === 'number' && !isNaN(r.obtainedScore)
            ? r.obtainedScore
            : (prizeBase > 0 ? prizeBase : 50);
          catEarned += (baseScore * prizeMult * lvlMult);
        });
      } else if (cat.code === 'QUALIFICATION') {
        const records = st.performanceRecords.filter((r: any) => r.categoryId === cat.id);
        records.forEach((r: any) => {
          const subMult = typeof r.subcategory?.weight === 'number' && r.subcategory.weight > 0 ? r.subcategory.weight : 1.0;
          const lvlMult = resolveLevelMultiplier(r.level, levelsList);
          const prizeMult = resolvePrizeMultiplier(r.position);
          const prizeBase = resolvePrizeBaseScore(r.position, settings);
          const baseScore = typeof r.obtainedScore === 'number' && !isNaN(r.obtainedScore)
            ? r.obtainedScore
            : (prizeBase > 0 ? prizeBase : (r.subcategory?.maxScore || 50));
          catEarned += (baseScore * subMult * lvlMult * prizeMult);
        });
      } else if (cat.code === 'SCHOOL' || cat.code === 'ISLAMIC') {
        const records = st.performanceRecords.filter((r: any) => r.categoryId === cat.id);
        if (records.length > 0) {
          const examGroups = new Map<string, any[]>();
          records.forEach((r: any) => {
            const key = (r.exam?.name || 'General Assessment').trim().toLowerCase();
            if (!examGroups.has(key)) examGroups.set(key, []);
            examGroups.get(key)!.push(r);
          });
          let catSum = 0;
          examGroups.forEach((recs) => {
            const examActualMax = recs[0]?.exam?.maxScore || (cat.code === 'SCHOOL' ? 130 : 100);
            const totObt = recs.reduce((sum: number, r: any) => sum + (r.obtainedScore || 0), 0);
            const totMax = recs.reduce((sum: number, r: any) => sum + (r.maxScore || r.subject?.maxScore || 100), 0);
            const pct = totMax > 0 ? (totObt / totMax) * 100 : 0;
            catSum += ((pct / 100) * examActualMax);
          });
          catEarned = Number(catSum.toFixed(2));
        }
      } else {
        const records = st.performanceRecords.filter((r: any) => r.categoryId === cat.id);
        records.forEach((r: any) => {
          const mult = typeof r.subcategory?.weight === 'number' && r.subcategory.weight > 0 ? r.subcategory.weight : 1.0;
          const lvlMult = resolveLevelMultiplier(r.level, levelsList);
          const prizeMult = resolvePrizeMultiplier(r.position);
          const base = r.obtainedScore || 0;
          catEarned += (base * mult * lvlMult * prizeMult);
        });
      }
      totalPoints += Number(catEarned.toFixed(2));
    }
    studentScores.push({
      id: st.id,
      spr: Number(totalPoints.toFixed(2)),
      classId: st.classId,
      schoolId: st.schoolId,
    });
  }

  const classList = classId ? studentScores.filter((s) => s.classId === classId) : studentScores;
  const schoolList = schoolId ? studentScores.filter((s) => s.schoolId === schoolId) : studentScores;

  return {
    overallRank: computeTiedRank(studentScores, studentId),
    classRank: computeTiedRank(classList, studentId),
    schoolRank: computeTiedRank(schoolList, studentId),
    totalStudentsOverall: studentScores.length,
    totalStudentsInClass: classList.length,
    totalStudentsInSchool: schoolList.length,
  };
}

async function runBenchmarkAndVerification() {
  console.log('========================================================================');
  console.log('     COMPARING OLD vs NEW IMPLEMENTATION FOR TOP 5 STUDENTS             ');
  console.log('========================================================================\n');

  const allLb = await calculateAllLeaderboards();
  console.log(`Verifying all ${allLb.length} students in cohort...`);
  let matchCount = 0;
  let mismatchCount = 0;

  for (const s of allLb) {
    const stRecord = await prisma.student.findUnique({
      where: { id: s.studentId },
      include: { class: true, school: true, academicYear: true },
    });
    if (!stRecord) continue;

    // Test Old method
    const oldClassEntries = allLb.filter((e) => e.className === stRecord.class.name);
    const oldSchoolEntries = allLb.filter((e) => e.schoolName === stRecord.school.name);
    const oldOverallRank = computeTiedRank(allLb as any, s.studentId);
    const oldClassRank = computeTiedRank(oldClassEntries as any, s.studentId);
    const oldSchoolRank = computeTiedRank(oldSchoolEntries as any, s.studentId);

    // Test New Fast method
    const newRanks = await calculateFastStudentRanks(
      s.studentId,
      stRecord.academicYearId,
      stRecord.classId,
      stRecord.schoolId
    );

    const isIdentical =
      oldOverallRank === newRanks.overallRank &&
      oldClassRank === newRanks.classRank &&
      oldSchoolRank === newRanks.schoolRank &&
      allLb.length === newRanks.totalStudentsOverall &&
      oldClassEntries.length === newRanks.totalStudentsInClass &&
      oldSchoolEntries.length === newRanks.totalStudentsInSchool;

    if (!isIdentical) {
      console.error(`MISMATCH for student ${s.name} (${s.studentId})!`);
      console.error(`  OLD: Overall #${oldOverallRank}/${allLb.length}, Class #${oldClassRank}/${oldClassEntries.length}, School #${oldSchoolRank}/${oldSchoolEntries.length}`);
      console.error(`  NEW: Overall #${newRanks.overallRank}/${newRanks.totalStudentsOverall}, Class #${newRanks.classRank}/${newRanks.totalStudentsInClass}, School #${newRanks.schoolRank}/${newRanks.totalStudentsInSchool}`);
      mismatchCount++;
    } else {
      matchCount++;
    }
  }

  console.log(`Verification Complete: ${matchCount}/${allLb.length} students 100% matched (${mismatchCount} mismatches)`);
  if (mismatchCount > 0) {
    process.exit(1);
  }

  // Print comparison for top 5 students
  console.log('\n--- TOP 5 STUDENTS VERIFICATION DETAILS ---');
  for (const s of allLb.slice(0, 5)) {
    const stRecord = await prisma.student.findUnique({
      where: { id: s.studentId },
      include: { class: true, school: true, academicYear: true },
    });
    if (!stRecord) continue;

    const oldClassEntries = allLb.filter((e) => e.className === stRecord.class.name);
    const oldSchoolEntries = allLb.filter((e) => e.schoolName === stRecord.school.name);
    const oldOverallRank = computeTiedRank(allLb as any, s.studentId);
    const oldClassRank = computeTiedRank(oldClassEntries as any, s.studentId);
    const oldSchoolRank = computeTiedRank(oldSchoolEntries as any, s.studentId);

    const newRanks = await calculateFastStudentRanks(
      s.studentId,
      stRecord.academicYearId,
      stRecord.classId,
      stRecord.schoolId
    );

    console.log(`Student: ${s.name}`);
    console.log(`  SPR Total Score: ${s.spr} pts`);
    console.log(`  OLD: Overall #${oldOverallRank}/${allLb.length} | Class #${oldClassRank}/${oldClassEntries.length} | School #${oldSchoolRank}/${oldSchoolEntries.length}`);
    console.log(`  NEW: Overall #${newRanks.overallRank}/${newRanks.totalStudentsOverall} | Class #${newRanks.classRank}/${newRanks.totalStudentsInClass} | School #${newRanks.schoolRank}/${newRanks.totalStudentsInSchool}`);
    console.log(`  Status: 100% IDENTICAL MATCH\n`);
  }

  // Measure Cold timing of full Student Dossier endpoint
  console.log('--- Measuring Cold Latency Comparison for Student Dossier ---');
  const targetStudentId = allLb[0].studentId;

  // Cold OLD method
  invalidateEngineCache();
  const startOld = performance.now();
  const profileOld = await calculateStudentSPR(targetStudentId);
  await calculateAllLeaderboards({ academicYearId: profileOld?.student.academicYear.id });
  const timeOld = performance.now() - startOld;
  console.log(`OLD Dossier Method Cold Duration: ${timeOld.toFixed(1)} ms`);

  // Cold NEW method
  invalidateEngineCache();
  const startNew = performance.now();
  const profileNew = await calculateStudentSPR(targetStudentId);
  await calculateFastStudentRanks(
    targetStudentId,
    profileNew?.student.academicYear?.id,
    profileNew?.student.class?.id,
    profileNew?.student.school?.id
  );
  const timeNew = performance.now() - startNew;
  console.log(`NEW Dossier Method Cold Duration: ${timeNew.toFixed(1)} ms`);
  console.log(`Speedup: ${(timeOld / timeNew).toFixed(2)}x faster (${(timeOld - timeNew).toFixed(1)} ms saved!)\n`);
}

runBenchmarkAndVerification().catch(console.error).finally(() => prisma.$disconnect());
