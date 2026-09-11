export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { invalidateEngineCache, getCachedSettings } from '@/lib/spr-engine';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'VIEWER');
    if (errorResponse) return errorResponse;

    const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } }) ||
      await prisma.academicYear.findFirst();
    const settings = await getCachedSettings();

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
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.subcategory.findMany({
        where: { active: true },
        include: { category: true },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.creativeHubCategory.findMany({
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.publishedMedia.findMany({
        orderBy: { name: 'asc' },
      }),
    ]);

    const weights = categories.map((cat) => ({
      categoryId: cat.id,
      code: cat.code,
      name: cat.name,
      icon: cat.icon,
      priority: cat.displayOrder,
      displayOrder: cat.displayOrder,
      weight: cat.categoryWeights[0]?.weight ?? cat.defaultWeight ?? 1.0,
      isActive: cat.categoryWeights[0]?.isActive ?? cat.active,
      isIncludedInSPR: cat.categoryWeights[0]?.isIncludedInSPR ?? cat.includeInSPR,
    }));

    return NextResponse.json({
      weights,
      levels,
      subcategories,
      creativeForms,
      publishedMedia,
      settings: {
        missingDataRule: settings.MISSING_DATA_RULE || 'IGNORE_NORMALIZE',
        prizeScore1st: settings.PRIZE_SCORE_1ST || '100',
        prizeScore2nd: settings.PRIZE_SCORE_2ND || '75',
        prizeScore3rd: settings.PRIZE_SCORE_3RD || '50',
        creativeBaseArticle: settings.CREATIVE_BASE_ARTICLE || '50',
        creativeBaseResearch: settings.CREATIVE_BASE_RESEARCH || '100',
        creativeBaseStory: settings.CREATIVE_BASE_STORY || '75',
        creativeBasePoem: settings.CREATIVE_BASE_POEM || '50',
        creativeBaseResponse: settings.CREATIVE_BASE_RESPONSE || '40',
        creativeBaseLetter: settings.CREATIVE_BASE_LETTER || '30',
        creativeBaseReview: settings.CREATIVE_BASE_REVIEW || '50',
        creativeBaseOthers: settings.CREATIVE_BASE_OTHERS || '30',
        qualificationBaseDefault: settings.QUALIFICATION_BASE_DEFAULT || '50',
      },
      academicYear: currentYear,
    });
  } catch (error: any) {
    console.error('Weights fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch scoring configuration.' }, { status: 500 });
  }
}

async function handleUpdateWeights(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const {
      weights,
      missingDataRule,
      levels,
      subcategories,
      creativeForms,
      publishedMedia,
      prizeScore1st,
      prizeScore2nd,
      prizeScore3rd,
      creativeBaseArticle,
      creativeBaseResearch,
      creativeBaseStory,
      creativeBasePoem,
      creativeBaseResponse,
      creativeBaseLetter,
      creativeBaseReview,
      creativeBaseOthers,
      qualificationBaseDefault,
    } = body;

    // 1. Update System Settings for Scoring
    const settingsToUpdate: Record<string, string> = {};
    if (missingDataRule !== undefined) settingsToUpdate.MISSING_DATA_RULE = missingDataRule;
    if (prizeScore1st !== undefined) settingsToUpdate.PRIZE_SCORE_1ST = String(prizeScore1st);
    if (prizeScore2nd !== undefined) settingsToUpdate.PRIZE_SCORE_2ND = String(prizeScore2nd);
    if (prizeScore3rd !== undefined) settingsToUpdate.PRIZE_SCORE_3RD = String(prizeScore3rd);
    if (creativeBaseArticle !== undefined) settingsToUpdate.CREATIVE_BASE_ARTICLE = String(creativeBaseArticle);
    if (creativeBaseResearch !== undefined) settingsToUpdate.CREATIVE_BASE_RESEARCH = String(creativeBaseResearch);
    if (creativeBaseStory !== undefined) settingsToUpdate.CREATIVE_BASE_STORY = String(creativeBaseStory);
    if (creativeBasePoem !== undefined) settingsToUpdate.CREATIVE_BASE_POEM = String(creativeBasePoem);
    if (creativeBaseResponse !== undefined) settingsToUpdate.CREATIVE_BASE_RESPONSE = String(creativeBaseResponse);
    if (creativeBaseLetter !== undefined) settingsToUpdate.CREATIVE_BASE_LETTER = String(creativeBaseLetter);
    if (creativeBaseReview !== undefined) settingsToUpdate.CREATIVE_BASE_REVIEW = String(creativeBaseReview);
    if (creativeBaseOthers !== undefined) settingsToUpdate.CREATIVE_BASE_OTHERS = String(creativeBaseOthers);
    if (qualificationBaseDefault !== undefined) settingsToUpdate.QUALIFICATION_BASE_DEFAULT = String(qualificationBaseDefault);

    for (const [key, value] of Object.entries(settingsToUpdate)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } }) ||
      await prisma.academicYear.findFirst();

    // 2. Update Core Category Multipliers & Priority
    if (weights && Array.isArray(weights)) {
      for (let i = 0; i < weights.length; i++) {
        const item = weights[i];
        const displayOrder = item.displayOrder !== undefined ? item.displayOrder : (item.priority !== undefined ? item.priority : i + 1);

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
                weight: Number(item.weight) || 1.0,
                isActive: item.isActive !== undefined ? item.isActive : true,
                isIncludedInSPR: item.isIncludedInSPR !== undefined ? item.isIncludedInSPR : true,
              },
            });
          } else {
            await prisma.categoryWeight.create({
              data: {
                id: `weight-${item.categoryId}-${currentYear.id}`,
                categoryId: item.categoryId,
                academicYearId: currentYear.id,
                weight: Number(item.weight) || 1.0,
                isActive: item.isActive !== undefined ? item.isActive : true,
                isIncludedInSPR: item.isIncludedInSPR !== undefined ? item.isIncludedInSPR : true,
              },
            });
          }
        }

        // Update default values on Category
        await prisma.category.update({
          where: { id: item.categoryId },
          data: {
            defaultWeight: Number(item.weight) || 1.0,
            displayOrder: Number(displayOrder),
            includeInSPR: item.isIncludedInSPR !== undefined ? item.isIncludedInSPR : true,
            active: item.isActive !== undefined ? item.isActive : true,
          },
        });
      }
    }

    // 3. Update Competition / Festival Level Multipliers & Orders
    if (levels && Array.isArray(levels)) {
      for (let i = 0; i < levels.length; i++) {
        const lvl = levels[i];
        if (lvl.id) {
          await prisma.level.update({
            where: { id: lvl.id },
            data: {
              name: lvl.name ? lvl.name.trim() : undefined,
              weightMultiplier: Number(lvl.weightMultiplier) || 1.0,
              displayOrder: lvl.displayOrder !== undefined ? Number(lvl.displayOrder) : i + 1,
              active: lvl.active !== undefined ? lvl.active : true,
            },
          });
        } else if (lvl.name && lvl.code) {
          await prisma.level.create({
            data: {
              name: lvl.name.trim(),
              code: lvl.code.trim().toUpperCase(),
              weightMultiplier: Number(lvl.weightMultiplier) || 1.0,
              displayOrder: lvl.displayOrder !== undefined ? Number(lvl.displayOrder) : i + 1,
              active: lvl.active !== undefined ? lvl.active : true,
            },
          });
        }
      }
    }

    // 4. Update Custom Subcategories Weights & Orders
    if (subcategories && Array.isArray(subcategories)) {
      for (let i = 0; i < subcategories.length; i++) {
        const sub = subcategories[i];
        if (sub.id) {
          await prisma.subcategory.update({
            where: { id: sub.id },
            data: {
              name: sub.name ? sub.name.trim() : undefined,
              weight: sub.weight !== undefined ? Number(sub.weight) : undefined,
              displayOrder: sub.displayOrder !== undefined ? Number(sub.displayOrder) : i + 1,
              active: sub.active !== undefined ? sub.active : undefined,
              maxScore: sub.maxScore !== undefined ? Number(sub.maxScore) : undefined,
            },
          });
        }
      }
    }

    // 5. Update Creative Forms Base Points, Weights & Orders
    if (creativeForms && Array.isArray(creativeForms)) {
      for (let i = 0; i < creativeForms.length; i++) {
        const cf = creativeForms[i];
        if (cf.id) {
          await prisma.creativeHubCategory.update({
            where: { id: cf.id },
            data: {
              name: cf.name ? cf.name.trim() : undefined,
              weight: cf.weight !== undefined ? Number(cf.weight) : undefined,
              displayOrder: cf.displayOrder !== undefined ? Number(cf.displayOrder) : i + 1,
              active: cf.active !== undefined ? cf.active : undefined,
            },
          });
        } else if (cf.name && cf.code) {
          await prisma.creativeHubCategory.create({
            data: {
              name: cf.name.trim(),
              code: cf.code.trim().toUpperCase(),
              weight: Number(cf.weight) || 1.0,
              displayOrder: cf.displayOrder !== undefined ? Number(cf.displayOrder) : i + 1,
              active: cf.active !== undefined ? cf.active : true,
            },
          });
        }
      }
    }

    // 6. Update Published Media Multipliers
    if (publishedMedia && Array.isArray(publishedMedia)) {
      for (const pm of publishedMedia) {
        if (pm.id) {
          await prisma.publishedMedia.update({
            where: { id: pm.id },
            data: {
              name: pm.name ? pm.name.trim() : undefined,
              weight: pm.weight !== undefined ? Number(pm.weight) : 1.0,
              active: pm.active !== undefined ? pm.active : true,
            },
          });
        }
      }
    }

    invalidateEngineCache();

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'UPDATE',
      entity: 'ScoringRule',
      newValue: {
        weights,
        missingDataRule,
        levels,
        subcategories,
        creativeForms,
        publishedMedia,
        settingsToUpdate,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'All SPR Scoring Rules, Base Points, Multipliers, and Level settings updated successfully.',
    });
  } catch (error: any) {
    console.error('Update scoring settings error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update scoring settings.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handleUpdateWeights(req);
}

export async function PUT(req: NextRequest) {
  return handleUpdateWeights(req);
}
