import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { CategoryEarningItem, WalletSummary, StoreFundSummary } from '@/types';
import { getCachedSettings } from './spr-engine';

// Default Planned Earnings Start Date: November 1, 2026 (strictly for records after November 1st)
export const DEFAULT_ELIGIBILITY_START_DATE = '2026-11-01T00:00:00.000Z';

// Authoritative list of categories permitted to generate cash earnings
export const ALLOWED_CASH_CATEGORY_CODES = new Set([
  'ISLAMIC',
  'SCHOOL',
  'QUALIFICATION',
  'CREATIVE_HUB',
  'LIBRARY',
  'KUTHBKHANA',
  'LITERARY',
  'PROGRAMS',
  'COMPETITIONS',
  'TASKS',
  'FIELD_COLLECTION',
]);

/**
 * Retrieves the configured eligibility start date from SystemSettings or fallback.
 */
export async function getEarningsEligibilityStartDate(): Promise<Date> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'EARNINGS_ELIGIBILITY_START_DATE' },
    });
    if (setting && setting.value) {
      const d = new Date(setting.value);
      if (!isNaN(d.getTime())) return d;
    }
  } catch (err) {
    // fallback
  }
  return new Date(DEFAULT_ELIGIBILITY_START_DATE);
}

/**
 * Helper to compute category multiplier from authoritative config.
 * Ignores legacy percentage weights (such as 13.33% or 20%).
 * Multipliers are expected to be between 0.1 and 10.0 (e.g. 1.5, 1.4, 1.35, 1.3, 1.25, 1.2, 1.0).
 */
export function resolveCategoryMultiplier(category: any, academicYearId?: string): number {
  if (!category) return 1.0;

  // Check specific academic year weight record
  if (category.categoryWeights && category.categoryWeights.length > 0) {
    const yrWeight = academicYearId
      ? category.categoryWeights.find((w: any) => w.academicYearId === academicYearId && w.isActive !== false)
      : category.categoryWeights.find((w: any) => w.academicYearId !== null && w.isActive !== false);

    if (yrWeight && typeof yrWeight.weight === 'number' && yrWeight.weight > 0 && yrWeight.weight <= 10.0) {
      return yrWeight.weight;
    }
  }

  // Check defaultWeight on Category model (typically 1.5, 1.4, etc.)
  if (typeof category.defaultWeight === 'number' && category.defaultWeight > 0 && category.defaultWeight <= 10.0) {
    return category.defaultWeight;
  }

  return 1.0;
}

/**
 * Calculates earnings for a given eligible point score and category multiplier.
 * Rule: Every 10 points = ₹1 before applying category multiplier.
 * Formula: Category Earnings = (Eligible Points / 10) * Category Multiplier.
 * Uses exact 2-decimal rounded precision.
 */
export function calculateCategoryEarnings(eligiblePoints: number, multiplier: number): number {
  if (!eligiblePoints || eligiblePoints <= 0) return 0;
  if (!multiplier || multiplier <= 0) return 0;

  // Exact arithmetic: (points / 10) * multiplier -> rounded to 2 decimal places
  const rawAmount = (eligiblePoints / 10) * multiplier;
  return Math.round((rawAmount + Number.EPSILON) * 100) / 100;
}

/**
 * Ensures a student wallet and store fund record exist.
 */
export async function getOrCreateStudentWallet(studentId: string, tx?: Prisma.TransactionClient) {
  const db = tx || prisma;

  let wallet = await db.studentWallet.findUnique({
    where: { studentId },
  });

  if (!wallet) {
    wallet = await db.studentWallet.create({
      data: {
        studentId,
        balance: new Prisma.Decimal(0),
        totalEarnings: new Prisma.Decimal(0),
        totalTransferred: new Prisma.Decimal(0),
        totalReceived: new Prisma.Decimal(0),
        totalContributedToStore: new Prisma.Decimal(0),
      },
    });
  }

  let storeFund = await db.storeFundRecord.findUnique({
    where: { studentId },
  });

  if (!storeFund) {
    storeFund = await db.storeFundRecord.create({
      data: {
        studentId,
        totalContributed: new Prisma.Decimal(0),
        totalUsed: new Prisma.Decimal(0),
        availableFund: new Prisma.Decimal(0),
      },
    });
  }

  return { wallet, storeFund };
}

/**
 * Recalculates earnings for a student idempotently based on eligible activity records.
 * Only activities on or after the eligibility date generate earnings.
 * Re-running this function never duplicates wallet credits or resets spent money.
 */
export async function syncStudentEarnings(studentId: string): Promise<{
  wallet: WalletSummary;
  categoryEarnings: CategoryEarningItem[];
  storeFund: StoreFundSummary;
}> {
  return await prisma.$transaction(async (tx) => {
    const { wallet, storeFund } = await getOrCreateStudentWallet(studentId, tx);
    const eligibilityStartDate = await getEarningsEligibilityStartDate();

    const currentYear = await tx.academicYear.findFirst({ where: { isCurrent: true } });
    const categories = await tx.category.findMany({
      where: { active: true },
      include: {
        categoryWeights: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Fetch student performance records
    const performanceRecords = await tx.performanceRecord.findMany({
      where: {
        studentId,
      },
      include: {
        category: true,
        subcategory: true,
        exam: true,
      },
    });

    // Fetch creative hub submissions
    const creativeHubSubmissions = await tx.creativeHubSubmission.findMany({
      where: {
        studentId,
        score: { gt: 0 },
      },
      include: {
        category: true,
        publishedMedia: true,
      },
    });

    // Fetch monthly attendances
    const monthlyAttendances = await tx.monthlyAttendance.findMany({
      where: {
        studentId,
        points: { gt: 0 },
      },
    });

    // Fetch library records
    const libraryRecords = await tx.libraryRecord.findMany({
      where: {
        studentId,
      },
    });

    // Fetch existing ledger records for this student
    const existingLedgers = await tx.earningLedger.findMany({
      where: { studentId },
    });
    const ledgerBySourceId = new Map(existingLedgers.map((l) => [l.sourceRecordId || l.reference, l]));

    const categoryBreakdown: CategoryEarningItem[] = [];
    let netNewWalletCredit = new Prisma.Decimal(0);
    const processedLedgerIds = new Set<string>();

    const applyEarningItem = async ({
      sourceRecordId,
      reference,
      sourceType,
      activityDate,
      points,
      multiplier,
      metadata,
      description,
      categoryId,
    }: {
      sourceRecordId: string;
      reference: string;
      sourceType: string;
      activityDate: Date;
      points: number;
      multiplier: number;
      metadata: any;
      description: string;
      categoryId: string;
    }) => {
      const earnedAmount = calculateCategoryEarnings(points, multiplier);
      const existingEntry = ledgerBySourceId.get(sourceRecordId) || ledgerBySourceId.get(reference);
      if (existingEntry) {
        processedLedgerIds.add(existingEntry.id);
      }

      if (earnedAmount <= 0) {
        // If earned amount is zero and there was previously recognized earning, adjust down to 0
        if (existingEntry) {
          const previouslyRecognized = Number(existingEntry.recognizedAmount);
          if (previouslyRecognized > 0) {
            const delta = -previouslyRecognized;
            const deltaDecimal = new Prisma.Decimal(delta);
            await tx.earningLedger.update({
              where: { id: existingEntry.id },
              data: {
                eligiblePoints: new Prisma.Decimal(0),
                categoryMultiplier: new Prisma.Decimal(multiplier),
                calculatedAmount: new Prisma.Decimal(0),
                recognizedAmount: new Prisma.Decimal(0),
                status: 'ADJUSTED',
                updatedAt: new Date(),
              },
            });

            await tx.walletTransaction.create({
              data: {
                reference: `TXN-ADJ-${sourceRecordId}-${Date.now()}`,
                studentId,
                type: 'ADJUSTMENT',
                amount: deltaDecimal,
                balanceBefore: wallet.balance.add(netNewWalletCredit),
                balanceAfter: wallet.balance.add(netNewWalletCredit).add(deltaDecimal),
                description: `Adjustment: -₹${previouslyRecognized.toFixed(2)} (${description} - below cash threshold)`,
                status: 'COMPLETED',
              },
            });

            netNewWalletCredit = netNewWalletCredit.add(deltaDecimal);
          }
        }
        return 0;
      }

      if (!existingEntry) {
        // New eligible earning: create ledger entry and prepare wallet credit
        const earnedDecimal = new Prisma.Decimal(earnedAmount);
        await tx.earningLedger.create({
          data: {
            studentId,
            categoryId,
            sourceRecordId,
            sourceType,
            activityDate,
            eligiblePoints: new Prisma.Decimal(points),
            categoryMultiplier: new Prisma.Decimal(multiplier),
            calculatedAmount: earnedDecimal,
            recognizedAmount: earnedDecimal,
            status: 'CREDITED',
            reference,
            metadata: JSON.stringify(metadata),
          },
        });

        await tx.walletTransaction.create({
          data: {
            reference: `TXN-${reference}`,
            studentId,
            type: 'EARNING',
            amount: earnedDecimal,
            balanceBefore: wallet.balance.add(netNewWalletCredit),
            balanceAfter: wallet.balance.add(netNewWalletCredit).add(earnedDecimal),
            description,
            status: 'COMPLETED',
          },
        });

        netNewWalletCredit = netNewWalletCredit.add(earnedDecimal);
      } else {
        // Existing ledger entry: check if points or multiplier changed
        const previouslyRecognized = Number(existingEntry.recognizedAmount);
        const delta = Math.round((earnedAmount - previouslyRecognized + Number.EPSILON) * 100) / 100;

        if (delta !== 0) {
          const deltaDecimal = new Prisma.Decimal(delta);
          await tx.earningLedger.update({
            where: { id: existingEntry.id },
            data: {
              eligiblePoints: new Prisma.Decimal(points),
              categoryMultiplier: new Prisma.Decimal(multiplier),
              calculatedAmount: new Prisma.Decimal(earnedAmount),
              recognizedAmount: new Prisma.Decimal(earnedAmount),
              status: 'ADJUSTED',
              updatedAt: new Date(),
            },
          });

          await tx.walletTransaction.create({
            data: {
              reference: `TXN-ADJ-${sourceRecordId}-${Date.now()}`,
              studentId,
              type: 'ADJUSTMENT',
              amount: deltaDecimal,
              balanceBefore: wallet.balance.add(netNewWalletCredit),
              balanceAfter: wallet.balance.add(netNewWalletCredit).add(deltaDecimal),
              description: `Adjustment: ${delta >= 0 ? '+' : ''}₹${delta.toFixed(2)} (${description})`,
              status: 'COMPLETED',
            },
          });

          netNewWalletCredit = netNewWalletCredit.add(deltaDecimal);
        }
      }

      return earnedAmount;
    };

    for (const cat of categories) {
      let multiplier = resolveCategoryMultiplier(cat, currentYear?.id);
      let displayName = cat.name;
      let displayCode = cat.code;

      // Special rule: Kuthbkhana category instead of Library & Reading only in student wallet panel
      const isLibraryCat = cat.code === 'LIBRARY' || cat.code === 'KUTHBKHANA';
      if (isLibraryCat) {
        displayName = 'Kuthbkhana';
        displayCode = 'KUTHBKHANA';
        multiplier = 1.5; // permanent weightage for Kuthbkhana
      }

      if (cat.code === 'TASKS' || cat.code.startsWith('TASK')) {
        const studentTasks = await tx.studentTaskRecord.findMany({
          where: {
            studentId,
            status: 'APPROVED',
          },
          include: {
            task: true,
          },
        });

        let taskPointsSum = 0;
        let taskEarningsSum = 0;
        for (const st of studentTasks) {
          taskPointsSum += Number(st.awardedPoints) || 0;
          taskEarningsSum += Number(st.awardedAmount) || 0;
        }

        categoryBreakdown.push({
          categoryId: cat.id,
          categoryCode: 'TASKS',
          categoryName: cat.name || 'Tasks',
          icon: 'CheckSquare',
          eligiblePoints: Math.round(taskPointsSum * 100) / 100,
          multiplier: 1.0,
          earnings: Math.round(taskEarningsSum * 100) / 100,
        });
        continue;
      }

      let catRecords = performanceRecords.filter((r) => r.categoryId === cat.id);
      if (isLibraryCat) {
        // User rule: Only credit cash to Kuthbkhana subcategory in the main category of Library and Reading.
        // Not credit for Imthiyaaz library or other non-Kuthbkhana entries.
        catRecords = catRecords.filter(
          (r) =>
            r.subcategoryId === 'cmtx_sub_kuthbkhana' ||
            (r.remarks && (r.remarks.includes('[Muthala]') || r.remarks.includes('[Point picking]') || r.remarks.toLowerCase().includes('kuthbkhana'))) ||
            (r.subcategory && (r.subcategory.name?.toLowerCase().includes('kuthbkhana') || r.subcategory.code?.toLowerCase().includes('kuthbkhana')))
        );
      }

      let eligiblePointsSum = 0;
      let categoryEarningsSum = 0;
      const isAllowedCashCategory = ALLOWED_CASH_CATEGORY_CODES.has(cat.code) || isLibraryCat;

      // 1. Creative Hub Submissions (for CREATIVE_HUB category)
      if (cat.code === 'CREATIVE_HUB' && isAllowedCashCategory) {
        for (const sub of creativeHubSubmissions) {
          const recordDate = new Date(sub.date || sub.createdAt);
          const isEligible = recordDate >= eligibilityStartDate;

          if (isEligible) {
            const points = sub.score || 0;
            if (points > 0) {
              eligiblePointsSum += points;
              const earned = await applyEarningItem({
                sourceRecordId: sub.id,
                reference: `ERN-CH-${sub.id}`,
                sourceType: 'CREATIVE_HUB_SUBMISSION',
                activityDate: recordDate,
                points,
                multiplier,
                metadata: {
                  title: sub.title,
                  publicationStatus: sub.publicationStatus,
                  mediaName: sub.publishedMedia?.name || sub.publishedMediaName,
                  categoryDisplay: displayName,
                },
                description: `Earned ₹${calculateCategoryEarnings(points, multiplier).toFixed(2)} from ${displayName} - ${sub.title} (${points} pts × ${multiplier})`,
                categoryId: cat.id,
              });
              categoryEarningsSum += earned;
            }
          }
        }
      }

      // 2. Monthly Attendance Records (for ISLAMIC and SCHOOL)
      if ((cat.code === 'ISLAMIC' || cat.code === 'SCHOOL') && isAllowedCashCategory) {
        const catAttendances = monthlyAttendances.filter((a) => a.categoryCode === cat.code);
        for (const att of catAttendances) {
          // Cash rule: Strictly for records on or after November 1st (month >= 11 for year 2026)
          const attDate = new Date(Date.UTC(att.year, att.month - 1, 1));
          const isEligible = attDate >= eligibilityStartDate;

          // Attendance cash rule: out of mark is 20; credit cash only if rewarded with 15 or more points (>= 15 pts)
          const rawPoints = att.points || 0;
          const meetsAttendanceThreshold = rawPoints >= 15;
          const cashPoints = (isEligible && meetsAttendanceThreshold) ? rawPoints : 0;

          if (isEligible) {
            if (cashPoints > 0) {
              eligiblePointsSum += cashPoints;
            }
            const earned = await applyEarningItem({
              sourceRecordId: att.id,
              reference: `ERN-ATT-${att.id}`,
              sourceType: 'MONTHLY_ATTENDANCE',
              activityDate: attDate,
              points: cashPoints,
              multiplier,
              metadata: {
                monthName: att.monthName,
                month: att.month,
                year: att.year,
                percentage: att.percentage,
                categoryDisplay: displayName,
                meetsAttendanceThreshold,
              },
              description: `Earned ₹${calculateCategoryEarnings(cashPoints, multiplier).toFixed(2)} from ${displayName} Attendance (${att.monthName} ${att.year}) (${cashPoints} pts × ${multiplier})`,
              categoryId: cat.id,
            });
            categoryEarningsSum += earned;
          }
        }
      }

      // 3. Imthiyaaz Library Records (for LIBRARY)
      // USER RULE: Explicitly do NOT credit cash for Imthiyaaz Library records.
      // Cash is ONLY credited to Kuthbkhana subcategory in the main category of Library and Reading.
      if (isLibraryCat) {
        // Imthiyaaz library records yield ₹0 cash per institutional rules
      }

      // 4. Performance Records (Field Collection, Literary, Qualification, Programs, Islamic/School, Kuthbkhana, etc.)
      if (isAllowedCashCategory) {
        for (const record of catRecords) {
          const recordDate = new Date(record.date || record.createdAt);
          const isEligible = recordDate >= eligibilityStartDate;

          if (isEligible) {
            const points = record.obtainedScore || 0;
            if (points > 0) {
              // Cash rule for terms and assessments:
              // Cash must be credited only when the student obtains at least 70% of the maximum marks:
              // Eligibility formula: obtainedScore >= (maxScore * 0.70) (or percentage >= 70%)
              // Rules: 70% and above -> Eligible; Below 70% -> ₹0 cash.
              // Safely handles invalid or missing maximum marks.
              const isTermOrAssessment = Boolean(
                record.termId ||
                record.examId ||
                (record.category && (record.category.code === 'EXAM' || record.category.code === 'ASSESSMENT' || record.category.code === 'SCHOOL'))
              );

              let isEligibleForCash = true;
              if (isTermOrAssessment) {
                if (typeof record.maxScore === 'number' && record.maxScore > 0) {
                  isEligibleForCash = points >= (record.maxScore * 0.70);
                } else if (typeof record.percentage === 'number' && !isNaN(record.percentage)) {
                  isEligibleForCash = record.percentage >= 70;
                }
              }
              const cashPoints = isEligibleForCash ? points : 0;

              if (cashPoints > 0) {
                eligiblePointsSum += cashPoints;
              }

              const earned = await applyEarningItem({
                sourceRecordId: record.id,
                reference: `ERN-${record.id}`,
                sourceType: 'PERFORMANCE_RECORD',
                activityDate: recordDate,
                points: cashPoints,
                multiplier,
                metadata: {
                  maxScore: record.maxScore,
                  percentage: record.percentage,
                  position: record.position,
                  categoryDisplay: displayName,
                  isTermOrAssessment,
                  isEligibleForCash,
                  isBelow70Percent: !isEligibleForCash,
                },
                description: `Earned ₹${calculateCategoryEarnings(cashPoints, multiplier).toFixed(2)} from ${displayName} (${cashPoints} pts × ${multiplier})`,
                categoryId: cat.id,
              });
              categoryEarningsSum += earned;
            }
          }
        }
      }

      categoryBreakdown.push({
        categoryId: cat.id,
        categoryCode: displayCode,
        categoryName: displayName,
        icon: isLibraryCat ? 'book-open' : cat.icon,
        eligiblePoints: Math.round(eligiblePointsSum * 100) / 100,
        multiplier,
        earnings: Math.round(categoryEarningsSum * 100) / 100,
      });
    }

    // Reconcile and reverse any legacy pre-November or invalid entries in earningLedger
    for (const entry of existingLedgers) {
      if (!processedLedgerIds.has(entry.id) && Number(entry.recognizedAmount) > 0) {
        const previouslyRecognized = Number(entry.recognizedAmount);
        const delta = -previouslyRecognized;
        const deltaDecimal = new Prisma.Decimal(delta);

        await tx.earningLedger.update({
          where: { id: entry.id },
          data: {
            eligiblePoints: new Prisma.Decimal(0),
            calculatedAmount: new Prisma.Decimal(0),
            recognizedAmount: new Prisma.Decimal(0),
            status: 'ADJUSTED',
            updatedAt: new Date(),
          },
        });

        await tx.walletTransaction.create({
          data: {
            reference: `TXN-REV-${entry.id}-${Date.now()}`,
            studentId,
            type: 'ADJUSTMENT',
            amount: deltaDecimal,
            balanceBefore: wallet.balance.add(netNewWalletCredit),
            balanceAfter: wallet.balance.add(netNewWalletCredit).add(deltaDecimal),
            description: `Adjustment: -₹${previouslyRecognized.toFixed(2)} (Pre-November activity removed from monetization)`,
            status: 'COMPLETED',
          },
        });

        netNewWalletCredit = netNewWalletCredit.add(deltaDecimal);
      }
    }

    // Atomically apply net new wallet credit if any
    let updatedWallet = wallet;
    if (!netNewWalletCredit.isZero()) {
      updatedWallet = await tx.studentWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: netNewWalletCredit },
          totalEarnings: { increment: netNewWalletCredit },
        },
      });
    }

    return {
      wallet: {
        balance: Number(updatedWallet.balance),
        totalEarnings: Number(updatedWallet.totalEarnings),
        totalTransferred: Number(updatedWallet.totalTransferred),
        totalReceived: Number(updatedWallet.totalReceived),
        totalContributedToStore: Number(updatedWallet.totalContributedToStore),
      },
      categoryEarnings: categoryBreakdown,
      storeFund: {
        totalContributed: Number(storeFund.totalContributed),
        totalUsed: Number(storeFund.totalUsed),
        availableFund: Number(storeFund.availableFund),
        lastUsedAt: storeFund.lastUsedAt ? storeFund.lastUsedAt.toISOString() : null,
      },
    };
  }, {
    maxWait: 15000,
    timeout: 60000,
  });
}
