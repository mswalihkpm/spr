import { prisma } from './prisma';
import { MissingDataRule, CategorySummary, StudentSPRProfile, LeaderboardEntry } from '@/types';

export function normalizeScoreToPercentage(obtainedScore: number, maxScore: number): number {
  if (!maxScore || maxScore <= 0) return 0;
  const raw = (obtainedScore / maxScore) * 100;
  return Math.min(Math.max(Number(raw.toFixed(1)), 0), 100);
}

export function formatPercentage(val: number): string {
  return `${val.toFixed(1)}%`;
}

export async function getMissingDataRule(): Promise<MissingDataRule> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'MISSING_DATA_RULE' },
  });
  return (setting?.value as MissingDataRule) || 'IGNORE_NORMALIZE';
}

export async function calculateStudentSPR(
  studentId: string,
  academicYearId?: string,
  termId?: string
): Promise<StudentSPRProfile | null> {
  const includeConfig = {
    class: true,
    school: true,
    academicYear: true,
    performanceRecords: {
      where: {
        ...(academicYearId ? { academicYearId } : {}),
        ...(termId ? { termId } : {}),
      },
      include: {
        category: true,
        subject: {
          include: { institution: true, board: true },
        },
        exam: {
          include: { term: true },
        },
        competition: {
          include: { program: true },
        },
        literaryCompetition: {
          include: { event: true },
        },
        level: true,
      },
    },
    creativeWorks: true,
    libraryRecords: true,
  };

  let student = await prisma.student.findUnique({
    where: { id: studentId },
    include: includeConfig,
  });

  if (!student) {
    student = await prisma.student.findUnique({
      where: { studentId },
      include: includeConfig,
    });
  }

  if (!student) {
    student = await prisma.student.findFirst({
      where: { sprStudentId: { equals: studentId, mode: 'insensitive' } },
      include: includeConfig,
    });
  }

  if (!student) return null;

  const categories = await prisma.category.findMany({
    where: { active: true },
    include: {
      categoryWeights: {
        where: academicYearId ? { academicYearId } : undefined,
      },
    },
    orderBy: { displayOrder: 'asc' },
  });

  const missingDataRule = await getMissingDataRule();

  const categorySummaries: CategorySummary[] = [];
  let weightedSum = 0;
  let activeWeightsTotal = 0;
  let missingCategoriesCount = 0;

  for (const cat of categories) {
    const customWeight = cat.categoryWeights[0]?.weight;
    const isCatActive = cat.categoryWeights[0]?.isActive ?? cat.active;
    const isIncluded = cat.categoryWeights[0]?.isIncludedInSPR ?? cat.includeInSPR;
    const weight = customWeight !== undefined ? customWeight : cat.defaultWeight;

    if (!isCatActive) continue;

    // Aggregate category records
    let categoryRecords = student.performanceRecords.filter((r) => r.categoryId === cat.id);
    let categoryPercentage = 0;
    let recordsCount = categoryRecords.length;

    if (cat.code === 'CREATIVE_HUB' && student.creativeWorks.length > 0) {
      const creativePctSum = student.creativeWorks.reduce((acc, w) => acc + (w.percentage || 0), 0);
      categoryPercentage = Number((creativePctSum / student.creativeWorks.length).toFixed(1));
      recordsCount += student.creativeWorks.length;
    } else if (cat.code === 'LIBRARY' && student.libraryRecords.length > 0) {
      const readingScoreSum = student.libraryRecords.reduce((acc, r) => acc + (r.readingScore || 0), 0);
      categoryPercentage = Number((readingScoreSum / student.libraryRecords.length).toFixed(1));
      recordsCount += student.libraryRecords.length;
    } else if (recordsCount > 0) {
      const totalPct = categoryRecords.reduce((acc, r) => acc + r.percentage, 0);
      categoryPercentage = Number((totalPct / recordsCount).toFixed(1));
    }

    const hasData = recordsCount > 0;
    if (!hasData) {
      missingCategoriesCount++;
    }

    categorySummaries.push({
      categoryId: cat.id,
      categoryCode: cat.code,
      categoryName: cat.name,
      icon: cat.icon,
      weight,
      percentage: categoryPercentage,
      recordsCount,
      isIncluded,
    });

    if (isIncluded) {
      if (hasData) {
        weightedSum += (categoryPercentage * weight) / 100;
        activeWeightsTotal += weight;
      } else if (missingDataRule === 'TREAT_AS_ZERO') {
        activeWeightsTotal += weight;
      }
    }
  }

  let overallSPR = 0;
  if (missingDataRule === 'IGNORE_NORMALIZE') {
    if (activeWeightsTotal > 0) {
      overallSPR = Number(((weightedSum / (activeWeightsTotal / 100))).toFixed(1));
    } else {
      overallSPR = 0;
    }
  } else {
    overallSPR = Number(weightedSum.toFixed(1));
  }

  const recentRecords = student.performanceRecords
    .slice(0, 20)
    .map((r) => ({
      id: r.id,
      categoryName: r.category.name,
      categoryCode: r.category.code,
      eventName: r.subject?.name || r.competition?.name || r.literaryCompetition?.name || r.exam?.name || 'Assessment',
      subjectName: r.subject?.name,
      examName: r.exam?.name,
      competitionName: r.competition?.name,
      literaryCompetitionName: r.literaryCompetition?.name,
      institutionName: r.subject?.institution?.name,
      obtainedScore: r.obtainedScore,
      maxScore: r.maxScore,
      percentage: r.percentage,
      date: r.date.toISOString(),
      levelName: r.level?.name,
      remarks: r.remarks,
    }));

  // Group detailed records for calculation breakdowns
  const subjectWiseRecords = student.performanceRecords
    .filter((r) => r.category.code === 'ISLAMIC' || r.category.code === 'SCHOOL' || r.subjectId)
    .map((r) => ({
      id: r.id,
      categoryName: r.category.name,
      categoryCode: r.category.code,
      subjectName: r.subject?.name || 'Academic Subject',
      examName: r.exam?.name || 'Assessment',
      termName: r.exam?.term?.name || 'Annual',
      institutionName: r.subject?.institution?.name,
      obtainedScore: r.obtainedScore,
      maxScore: r.maxScore,
      percentage: r.percentage,
    }));

  const programmeWiseRecords = student.performanceRecords
    .filter((r) => r.category.code === 'PROGRAMS' || r.category.code === 'LITERARY' || r.competitionId || r.literaryCompetitionId)
    .map((r) => ({
      id: r.id,
      categoryName: r.category.name,
      categoryCode: r.category.code,
      festName: r.literaryCompetition?.event?.name || r.competition?.program?.name || 'Festival / Program',
      competitionName: r.literaryCompetition?.name || r.competition?.name || 'Competition Event',
      levelName: r.level?.name || 'Campus',
      obtainedScore: r.obtainedScore,
      maxScore: r.maxScore,
      percentage: r.percentage,
      remarks: r.remarks,
    }));

  return {
    student: {
      id: student.id,
      studentId: student.studentId,
      sprStudentId: student.sprStudentId,
      fullName: student.fullName,
      division: student.division,
      status: student.status,
      photoUrl: student.photoUrl,
      notes: student.notes,
      class: student.class,
      school: student.school,
      academicYear: student.academicYear,
    },
    overallSPR,
    rank: 1,
    classRank: 1,
    schoolRank: 1,
    totalStudentsInClass: 0,
    totalStudentsInSchool: 0,
    totalStudentsOverall: 0,
    categoryScores: categorySummaries,
    missingCategoriesCount,
    recentRecords,
    subjectWiseRecords,
    programmeWiseRecords,
    allRecords: student.performanceRecords.map((r) => ({
      id: r.id,
      categoryCode: r.category.code,
      categoryName: r.category.name,
      name: r.subject?.name || r.competition?.name || r.literaryCompetition?.name || r.exam?.name || 'Record',
      obtainedScore: r.obtainedScore,
      maxScore: r.maxScore,
      percentage: r.percentage,
      remarks: r.remarks,
    })),
  } as any;
}

export async function calculateAllLeaderboards(filters?: {
  academicYearId?: string;
  classId?: string;
  schoolId?: string;
  categoryId?: string;
  stream?: string; // e.g. 'JAMIATHUL_HIND', 'MADIN_ACADEMY'
  fest?: string; // e.g. 'SAHITYOTSAV', 'KALOTSAV', 'M_LIT', 'JAMIA_MAHRAJAN'
}): Promise<LeaderboardEntry[]> {
  const whereClause: any = { status: 'ACTIVE' };
  if (filters?.academicYearId) whereClause.academicYearId = filters.academicYearId;
  if (filters?.classId) whereClause.classId = filters.classId;
  if (filters?.schoolId) whereClause.schoolId = filters.schoolId;

  const students = await prisma.student.findMany({
    where: whereClause,
    include: {
      class: true,
      school: true,
      academicYear: true,
      performanceRecords: {
        include: {
          category: true,
          subject: {
            include: { institution: true, board: true },
          },
          competition: {
            include: { program: true },
          },
          literaryCompetition: {
            include: { event: true },
          },
        },
      },
      creativeWorks: true,
      libraryRecords: true,
    },
  });

  const categories = await prisma.category.findMany({
    where: { active: true },
    include: {
      categoryWeights: true,
    },
    orderBy: { displayOrder: 'asc' },
  });

  const missingDataRule = await getMissingDataRule();
  const entries: LeaderboardEntry[] = [];

  for (const student of students) {
    const categoryPercentages: Record<string, number> = {};
    let weightedSum = 0;
    let activeWeightsTotal = 0;
    let totalRecords = student.performanceRecords.length + student.creativeWorks.length + student.libraryRecords.length;

    // Stream-specific Islamic calculation if requested
    let streamIslamicScore = 0;
    let streamIslamicRecordsCount = 0;

    if (filters?.stream) {
      const streamTarget = filters.stream.toUpperCase();
      const streamRecords = student.performanceRecords.filter((r) => {
        const instCode = r.subject?.institution?.code?.toUpperCase() || '';
        const instName = r.subject?.institution?.name?.toUpperCase() || '';
        if (streamTarget === 'JAMIATHUL_HIND') {
          return instCode.includes('JAMIATHUL') || instName.includes('JAMIATHUL');
        }
        if (streamTarget === 'MADIN_ACADEMY') {
          return instCode.includes('MADIN') || instName.includes('MADIN');
        }
        return false;
      });

      if (streamRecords.length > 0) {
        const sum = streamRecords.reduce((acc, r) => acc + r.percentage, 0);
        streamIslamicScore = Number((sum / streamRecords.length).toFixed(1));
        streamIslamicRecordsCount = streamRecords.length;
      }
    }

    // Fest-specific Literary calculation if requested
    let festScore = 0;
    let festRecordsCount = 0;

    if (filters?.fest) {
      const festTarget = filters.fest.toUpperCase();
      const festRecords = student.performanceRecords.filter((r) => {
        const eventName = (r.literaryCompetition?.event?.name || r.competition?.program?.name || '').toUpperCase();
        const compName = (r.literaryCompetition?.name || r.competition?.name || '').toUpperCase();
        const remarks = (r.remarks || '').toUpperCase();

        if (festTarget.includes('SAHITYOTSAV') || festTarget.includes('SAHITHYOTSAV')) {
          return eventName.includes('SAHITYOTSAV') || compName.includes('SAHITYOTSAV') || remarks.includes('SAHITYOTSAV');
        }
        if (festTarget.includes('KALOTSAV')) {
          return eventName.includes('KALOTSAV') || compName.includes('KALOTSAV') || remarks.includes('KALOTSAV') || compName.includes('KERALA SCHOOL');
        }
        if (festTarget.includes('M_LIT') || festTarget.includes('M-LIT') || festTarget.includes('MLIT')) {
          return eventName.includes('M-LIT') || compName.includes('M-LIT') || remarks.includes('M-LIT') || eventName.includes('MLIT');
        }
        if (festTarget.includes('MAHRAJAN') || festTarget.includes('JAMIA')) {
          return eventName.includes('MAHRAJAN') || compName.includes('MAHRAJAN') || remarks.includes('MAHRAJAN') || eventName.includes('MAHARJAN');
        }
        return false;
      });

      if (festRecords.length > 0) {
        const sum = festRecords.reduce((acc, r) => acc + r.percentage, 0);
        festScore = Number((sum / festRecords.length).toFixed(1));
        festRecordsCount = festRecords.length;
      } else {
        // If student doesn't have exact fest records yet, check literary category score as fallback
        const litRecords = student.performanceRecords.filter((r) => r.category?.code === 'LITERARY');
        if (litRecords.length > 0) {
          const sum = litRecords.reduce((acc, r) => acc + r.percentage, 0);
          festScore = Number((sum / litRecords.length).toFixed(1));
          festRecordsCount = litRecords.length;
        }
      }
    }

    for (const cat of categories) {
      const customWeight = cat.categoryWeights[0]?.weight;
      const isCatActive = cat.categoryWeights[0]?.isActive ?? cat.active;
      const isIncluded = cat.categoryWeights[0]?.isIncludedInSPR ?? cat.includeInSPR;
      const weight = customWeight !== undefined ? customWeight : cat.defaultWeight;

      if (!isCatActive) continue;

      let categoryRecords = student.performanceRecords.filter((r) => r.categoryId === cat.id);
      let catPct = 0;
      let hasData = false;

      if (cat.code === 'CREATIVE_HUB' && student.creativeWorks.length > 0) {
        const sum = student.creativeWorks.reduce((acc, w) => acc + (w.percentage || 0), 0);
        catPct = Number((sum / student.creativeWorks.length).toFixed(1));
        hasData = true;
      } else if (cat.code === 'LIBRARY' && student.libraryRecords.length > 0) {
        const sum = student.libraryRecords.reduce((acc, r) => acc + (r.readingScore || 0), 0);
        catPct = Number((sum / student.libraryRecords.length).toFixed(1));
        hasData = true;
      } else if (categoryRecords.length > 0) {
        const sum = categoryRecords.reduce((acc, r) => acc + r.percentage, 0);
        catPct = Number((sum / categoryRecords.length).toFixed(1));
        hasData = true;
      }

      categoryPercentages[cat.id] = catPct;

      if (isIncluded) {
        if (hasData) {
          weightedSum += (catPct * weight) / 100;
          activeWeightsTotal += weight;
        } else if (missingDataRule === 'TREAT_AS_ZERO') {
          activeWeightsTotal += weight;
        }
      }
    }

    let finalScore = 0;
    if (filters?.fest) {
      finalScore = festScore;
      totalRecords = festRecordsCount;
    } else if (filters?.stream) {
      finalScore = streamIslamicScore;
      totalRecords = streamIslamicRecordsCount;
    } else if (filters?.categoryId) {
      finalScore = categoryPercentages[filters.categoryId] || 0;
    } else {
      if (missingDataRule === 'IGNORE_NORMALIZE') {
        finalScore = activeWeightsTotal > 0 ? Number((weightedSum / (activeWeightsTotal / 100)).toFixed(1)) : 0;
      } else {
        finalScore = Number(weightedSum.toFixed(1));
      }
    }

    entries.push({
      rank: 0,
      studentId: student.id,
      studentCode: student.studentId,
      studentIdCode: student.studentId,
      sprStudentId: student.sprStudentId,
      name: student.fullName,
      studentName: student.fullName,
      className: student.class.name,
      schoolName: student.school.name,
      spr: finalScore,
      overallScore: finalScore,
      photoUrl: student.photoUrl,
      division: student.division,
      categoryPercentages,
      recordsCount: totalRecords,
    });
  }

  // Sort descending by score
  entries.sort((a, b) => b.spr - a.spr);

  // Assign ranks with proper tie handling
  let currentRank = 1;
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].spr === entries[i - 1].spr) {
      entries[i].rank = entries[i - 1].rank;
    } else {
      entries[i].rank = currentRank;
    }
    currentRank++;
  }

  return entries;
}
