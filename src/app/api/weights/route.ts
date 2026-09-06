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

    const categories = await prisma.category.findMany({
      include: {
        categoryWeights: {
          where: currentYear ? { academicYearId: currentYear.id } : undefined,
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

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
    const { weights, missingDataRule } = body;

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

        // Also update default values on Category
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

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'UPDATE',
      entity: 'CategoryWeight',
      newValue: { weights, missingDataRule },
    });

    return NextResponse.json({
      success: true,
      message: 'Weights and calculation rules updated successfully.',
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

