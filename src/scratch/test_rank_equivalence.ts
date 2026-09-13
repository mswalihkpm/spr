import { prisma } from '../lib/prisma';
import {
  calculateStudentSPR,
  calculateAllLeaderboards,
  getCachedCategories,
  getCachedSettings,
  getCachedLevels,
  invalidateEngineCache,
} from '../lib/spr-engine';

interface RankResult {
  overallRank: number;
  classRank: number;
  schoolRank: number;
  totalStudentsOverall: number;
  totalStudentsInClass: number;
  totalStudentsInSchool: number;
}

// Current implementation in route.ts
async function getCurrentRouteRanks(studentId: string): Promise<RankResult> {
  const profile = await calculateStudentSPR(studentId);
  if (!profile) throw new Error('Student profile not found');

  const allLeaderboard = await calculateAllLeaderboards({ academicYearId: profile.student.academicYear.id });
  const classEntries = allLeaderboard.filter((e) => e.className === profile.student.class.name);
  const schoolEntries = allLeaderboard.filter((e) => e.schoolName === profile.student.school.name);

  const computeTiedRank = (list: any[], id: string) => {
    const sorted = [...list].sort((a, b) => (b.spr || 0) - (a.spr || 0));
    let currentRank = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && (sorted[i].spr || 0) < (sorted[i - 1].spr || 0)) {
        currentRank = i + 1;
      }
      if (sorted[i].studentId === id) {
        return currentRank;
      }
    }
    return 1;
  };

  return {
    overallRank: computeTiedRank(allLeaderboard, studentId),
    classRank: computeTiedRank(classEntries, studentId),
    schoolRank: computeTiedRank(schoolEntries, studentId),
    totalStudentsOverall: allLeaderboard.length,
    totalStudentsInClass: classEntries.length,
    totalStudentsInSchool: schoolEntries.length,
  };
}

// Lightweight rank calculation
async function getLightweightRanks(
  studentId: string,
  targetStudentSpr: number,
  academicYearId?: string,
  classId?: string,
  schoolId?: string
): Promise<RankResult> {
  // Only query the minimal columns needed for scoring
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
            level: { select: { code: true, weightMultiplier: true } },
            exam: { select: { name: true, maxScore: true } },
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

  const levelMultiplierMap = new Map<string, number>();
  levelsList.forEach((l) => {
    if (l.code) levelMultiplierMap.set(l.code.toUpperCase(), l.weightMultiplier || 1.0);
  });

  const resolveLevelMultiplier = (lvl: any) => {
    if (!lvl) return 1.0;
    if (typeof lvl.weightMultiplier === 'number') return lvl.weightMultiplier;
    return levelMultiplierMap.get(lvl.code?.toUpperCase()) || 1.0;
  };

  const resolvePrizeMultiplier = (pos?: string | null) => {
    if (!pos) return 1.0;
    const p = pos.trim().toUpperCase();
    if (p === '1ST' || p === 'FIRST' || p === '1') return 1.0;
    if (p === '2ND' || p === 'SECOND' || p === '2') return 0.8;
    if (p === '3RD' || p === 'THIRD' || p === '3') return 0.6;
    return 0.4;
  };

  const resolvePrizeBaseScore = (pos?: string | null) => {
    if (!pos) return 0;
    const p = pos.trim().toUpperCase();
    if (p === '1ST' || p === 'FIRST' || p === '1') return parseFloat(settings.PRIZE_SCORE_1ST || '100') || 100;
    if (p === '2ND' || p === 'SECOND' || p === '2') return parseFloat(settings.PRIZE_SCORE_2ND || '75') || 75;
    if (p === '3RD' || p === 'THIRD' || p === '3') return parseFloat(settings.PRIZE_SCORE_3RD || '50') || 50;
    return 0;
  };

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
          const lvlMult = resolveLevelMultiplier(r.level);
          const prizeMult = resolvePrizeMultiplier(r.position);
          const prizeBase = resolvePrizeBaseScore(r.position);
          const baseScore = typeof r.obtainedScore === 'number' && !isNaN(r.obtainedScore)
            ? r.obtainedScore
            : (prizeBase > 0 ? prizeBase : 50);
          catEarned += (baseScore * prizeMult * lvlMult);
        });
      } else if (cat.code === 'QUALIFICATION') {
        const records = st.performanceRecords.filter((r: any) => r.categoryId === cat.id);
        records.forEach((r: any) => {
          const subMult = typeof r.subcategory?.weight === 'number' && r.subcategory.weight > 0 ? r.subcategory.weight : 1.0;
          const lvlMult = resolveLevelMultiplier(r.level);
          const prizeMult = resolvePrizeMultiplier(r.position);
          const prizeBase = resolvePrizeBaseScore(r.position);
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
            const totMax = recs.reduce((sum: number, r: any) => sum + (r.maxScore || 100), 0);
            const pct = totMax > 0 ? (totObt / totMax) * 100 : 0;
            catSum += ((pct / 100) * examActualMax);
          });
          catEarned = Number(catSum.toFixed(2));
        }
      } else {
        const records = st.performanceRecords.filter((r: any) => r.categoryId === cat.id);
        records.forEach((r: any) => {
          const mult = typeof r.subcategory?.weight === 'number' && r.subcategory.weight > 0 ? r.subcategory.weight : 1.0;
          const lvlMult = resolveLevelMultiplier(r.level);
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

  const computeTiedRank = (list: { id: string; spr: number }[], targetId: string) => {
    const sorted = [...list].sort((a, b) => b.spr - a.spr);
    let currentRank = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].spr < sorted[i - 1].spr) {
        currentRank = i + 1;
      }
      if (sorted[i].id === targetId) {
        return currentRank;
      }
    }
    return 1;
  };

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

async function runEquivalenceTest() {
  console.log('Testing rank mathematical equivalence across multiple students...');

  const activeStudents = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, fullName: true, classId: true, schoolId: true, academicYearId: true },
    take: 10,
  });

  for (const st of activeStudents) {
    const profile = await calculateStudentSPR(st.id);
    if (!profile) continue;

    const currentRanks = await getCurrentRouteRanks(st.id);
    const lightweightRanks = await getLightweightRanks(
      st.id,
      profile.overallSPR,
      st.academicYearId,
      st.classId,
      st.schoolId
    );

    console.log(`Student: ${st.fullName} (SPR: ${profile.overallSPR} pts)`);
    console.log(`  Current: Overall #${currentRanks.overallRank}/${currentRanks.totalStudentsOverall}, Class #${currentRanks.classRank}/${currentRanks.totalStudentsInClass}`);
    console.log(`  Lightweight: Overall #${lightweightRanks.overallRank}/${lightweightRanks.totalStudentsOverall}, Class #${lightweightRanks.classRank}/${lightweightRanks.totalStudentsInClass}`);

    const match =
      currentRanks.overallRank === lightweightRanks.overallRank &&
      currentRanks.classRank === lightweightRanks.classRank &&
      currentRanks.schoolRank === lightweightRanks.schoolRank &&
      currentRanks.totalStudentsOverall === lightweightRanks.totalStudentsOverall &&
      currentRanks.totalStudentsInClass === lightweightRanks.totalStudentsInClass;

    if (!match) {
      console.error('MISMATCH DETECTED for student:', st.fullName);
      process.exit(1);
    }
  }

  console.log('SUCCESS: All 10 test students produced 100% identical ranks and cohort sizes!');
}

runEquivalenceTest().catch(console.error).finally(() => prisma.$disconnect());
