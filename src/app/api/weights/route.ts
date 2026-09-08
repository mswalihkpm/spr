export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'VIEWER');
    if (errorResponse) return errorResponse;

    const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
    const missingDataRuleSetting = await prisma.systemSetting.findUnique({
      where: { key: 'MISSING_DATA_RULE' },
    });

    const [categories, levels, subcategories, creativeForms, publishedMedia] = await Promise.all([
      prisma.category.findMany({
        include: {
          categoryWeights: {
            where: currentYear ? { academicYearId: currentYear.id } : undefined,
          },
        },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.level.findMany({
        where: { active: true },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.subcategory.findMany({
        where: { active: true },
        include: { category: true },
        orderBy: { name: 'asc' },
      }),
      prisma.creativeHubCategory.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
      prisma.publishedMedia.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const weights = categories.map((cat) => ({
      categoryId: cat.id,
      code: cat.code,
      name: cat.name,
      icon: cat.icon,
      weight: cat.categoryWeights[0]?.weight ?? cat.defaultWeight,
      isActive: cat.categoryWeights[0]?.isActive ?? cat.active,
      isIncludedInSPR: cat.categoryWeights[0]?.isIncludedInSPR ?? cat.includeInSPR,
    }));

    return NextResponse.json({
      weights,
      levels,
      subcategories,
      creativeForms,
      publishedMedia,
      missingDataRule: missingDataRuleSetting?.value || 'IGNORE_NORMALIZE',
      academicYear: currentYear,
    });
  } catch (error: any) {
    console.error('Weights fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch weights.' }, { status: 500 });
  }
}

async function handleUpdateWeights(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { weights, missingDataRule, levels, subcategories, creativeForms, publishedMedia } = body;

    if (missingDataRule) {
      await prisma.systemSetting.upsert({
        where: { key: 'MISSING_DATA_RULE' },
        update: { value: missingDataRule },
        create: {
          key: 'MISSING_DATA_RULE',
          value: missingDataRule,
          description: 'Strategy for handling missing category records',
        },
      });
    }

    const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });

    // 1. Update Core Category Weights
    if (weights && Array.isArray(weights)) {
      for (const item of weights) {
        if (currentYear) {
          const existingWeight = await prisma.categoryWeight.findFirst({
            where: {
              categoryId: item.categoryId,
              academicYearId: currentYear.id,
            },
          });

          if (existingWeight) {
            await prisma.categoryWeight.update({
              where: { id: existingWeight.id },
              data: {
                weight: Number(item.weight),
                isActive: item.isActive,
                isIncludedInSPR: item.isIncludedInSPR,
              },
            });
          } else {
            await prisma.categoryWeight.create({
              data: {
                id: `weight-${item.categoryId}-${currentYear.id}`,
                categoryId: item.categoryId,
                academicYearId: currentYear.id,
                weight: Number(item.weight),
                isActive: item.isActive,
                isIncludedInSPR: item.isIncludedInSPR,
              },
            });
          }
        }

        // Update default values on Category
        await prisma.category.update({
          where: { id: item.categoryId },
          data: {
            defaultWeight: Number(item.weight),
            includeInSPR: item.isIncludedInSPR,
            active: item.isActive,
          },
        });
      }
    }

    // 2. Update Competition / Festival Level Multipliers
    if (levels && Array.isArray(levels)) {
      for (const lvl of levels) {
        if (lvl.id) {
          await prisma.level.update({
            where: { id: lvl.id },
            data: {
              weightMultiplier: Number(lvl.weightMultiplier) || 1.0,
            },
          });
        }
      }
    }

    // 3. Update Custom Subcategories Weights
    if (subcategories && Array.isArray(subcategories)) {
      for (const sub of subcategories) {
        if (sub.id) {
          await prisma.subcategory.update({
            where: { id: sub.id },
            data: {
              weight: Number(sub.weight) || 1.0,
            },
          });
        }
      }
    }

    // 4. Update Creative Forms Weights
    if (creativeForms && Array.isArray(creativeForms)) {
      for (const cf of creativeForms) {
        if (cf.id) {
          await prisma.creativeHubCategory.update({
            where: { id: cf.id },
            data: {
              weight: Number(cf.weight) || 1.0,
            },
          });
        }
      }
    }

    // 5. Update Published Media Weights
    if (publishedMedia && Array.isArray(publishedMedia)) {
      for (const pm of publishedMedia) {
        if (pm.id) {
          await prisma.publishedMedia.update({
            where: { id: pm.id },
            data: {
              weight: Number(pm.weight) || 1.0,
            },
          });
        }
      }
    }

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'UPDATE',
      entity: 'CategoryWeight',
      newValue: { weights, missingDataRule, levels, subcategories, creativeForms, publishedMedia },
    });

    return NextResponse.json({
      success: true,
      message: 'All category weights, festival level multipliers, and subcategory coefficients updated successfully.',
    });
  } catch (error: any) {
    console.error('Update weights error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update weights.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handleUpdateWeights(req);
}

export async function PUT(req: NextRequest) {
  return handleUpdateWeights(req);
}
