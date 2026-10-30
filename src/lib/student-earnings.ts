import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { CategoryEarningItem, WalletSummary, StoreFundSummary } from '@/types';
import { getCachedSettings } from './spr-engine';

// Default Planned Earnings Start Date: November 1, 2026
export const DEFAULT_ELIGIBILITY_START_DATE = '2026-11-01T00:00:00.000Z';

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
      },
    });

    // Fetch existing ledger records for this student
    const existingLedgers = await tx.earningLedger.findMany({
      where: { studentId },
    });
    const ledgerBySourceId = new Map(existingLedgers.map((l) => [l.sourceRecordId || l.reference, l]));

    const categoryBreakdown: CategoryEarningItem[] = [];
    let netNewWalletCredit = new Prisma.Decimal(0);

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
        // In student wallet, value Kuthbkhana records (subcategoryId cmtx_sub_kuthbkhana or remarks)
        catRecords = catRecords.filter(
          (r) =>
            r.subcategoryId === 'cmtx_sub_kuthbkhana' ||
            (r.remarks && (r.remarks.includes('[Muthala]') || r.remarks.includes('[Point picking]') || r.remarks.toLowerCase().includes('kuthbkhana'))) ||
            !r.subcategoryId
        );
      }

      let eligiblePointsSum = 0;
      let categoryEarningsSum = 0;

      for (const record of catRecords) {
        // Date-based eligibility check:
        // Must use record.date (the activity date), not createdAt!
        const recordDate = new Date(record.date);
        const isEligible = recordDate >= eligibilityStartDate;

        if (isEligible) {
          const points = record.obtainedScore || 0;
          if (points > 0) {
            eligiblePointsSum += points;
            const earnedAmount = calculateCategoryEarnings(points, multiplier);
            categoryEarningsSum += earnedAmount;

            const reference = `ERN-${record.id}`;
            const existingEntry = ledgerBySourceId.get(record.id) || ledgerBySourceId.get(reference);

            if (!existingEntry) {
              // New eligible earning: create ledger entry and prepare wallet credit
              const earnedDecimal = new Prisma.Decimal(earnedAmount);
              await tx.earningLedger.create({
                data: {
                  studentId,
                  categoryId: cat.id,
                  sourceRecordId: record.id,
                  sourceType: 'PERFORMANCE_RECORD',
                  activityDate: recordDate,
                  eligiblePoints: new Prisma.Decimal(points),
                  categoryMultiplier: new Prisma.Decimal(multiplier),
                  calculatedAmount: earnedDecimal,
                  recognizedAmount: earnedDecimal,
                  status: 'CREDITED',
                  reference,
                  metadata: JSON.stringify({
                    maxScore: record.maxScore,
                    percentage: record.percentage,
                    position: record.position,
                    categoryDisplay: displayName,
                  }),
                },
              });

              // Create transaction log
              await tx.walletTransaction.create({
                data: {
                  reference: `TXN-${reference}`,
                  studentId,
                  type: 'EARNING',
                  amount: earnedDecimal,
                  balanceBefore: wallet.balance.add(netNewWalletCredit),
                  balanceAfter: wallet.balance.add(netNewWalletCredit).add(earnedDecimal),
                  description: `Earned ₹${earnedAmount.toFixed(2)} from ${displayName} (${points} pts × ${multiplier})`,
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
                    reference: `TXN-ADJ-${record.id}-${Date.now()}`,
                    studentId,
                    type: 'ADJUSTMENT',
                    amount: deltaDecimal,
                    balanceBefore: wallet.balance.add(netNewWalletCredit),
                    balanceAfter: wallet.balance.add(netNewWalletCredit).add(deltaDecimal),
                    description: `Adjustment for ${cat.name}: ${delta >= 0 ? '+' : ''}₹${delta.toFixed(2)}`,
                    status: 'COMPLETED',
                  },
                });

                netNewWalletCredit = netNewWalletCredit.add(deltaDecimal);
              }
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
