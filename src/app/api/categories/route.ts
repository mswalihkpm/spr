export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const category = await prisma.category.findFirst({
        where: {
          OR: [
            { id: id },
            { code: id.toUpperCase() },
          ],
        },
        include: {
          subcategories: {
            include: {
              _count: { select: { performanceRecords: true } },
            },
            orderBy: [
              { displayOrder: 'asc' },
              { createdAt: 'asc' },
            ],
          },
          categoryWeights: true,
          _count: {
            select: {
              subcategories: true,
              performanceRecords: true,
              subjects: true,
              exams: true,
            },
          },
        },
      });

      if (!category) {
        return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
      }

      return NextResponse.json({ category });
    }

    const categories = await prisma.category.findMany({
      include: {
        subcategories: {
          include: {
            _count: { select: { performanceRecords: true } },
          },
        },
        categoryWeights: true,
        _count: {
          select: {
            subcategories: true,
            performanceRecords: true,
            subjects: true,
            exams: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('Categories fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { name, description, icon, defaultWeight, includeInSPR, subcategories } = body;

    if (!name) {
      return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });
    }

    const code = name.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_' + Date.now().toString().slice(-4);

    const category = await prisma.category.create({
      data: {
        code,
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon || 'Award',
        defaultWeight: Number(defaultWeight) || 10.0,
        includeInSPR: includeInSPR !== undefined ? includeInSPR : true,
        isSystem: false,
        active: true,
      },
    });

    // Create subcategories if provided
    if (subcategories && Array.isArray(subcategories)) {
      for (const sub of subcategories) {
        if (sub.name) {
          const subCode = sub.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
          await prisma.subcategory.create({
            data: {
              categoryId: category.id,
              name: sub.name.trim(),
              code: subCode,
              maxScore: Number(sub.maxScore) || 100,
            },
          });
        }
      }
    }

    // Attach CategoryWeight for active academic year
    const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
    if (currentYear) {
      await prisma.categoryWeight.create({
        data: {
          categoryId: category.id,
          academicYearId: currentYear.id,
          weight: category.defaultWeight,
          isActive: true,
          isIncludedInSPR: category.includeInSPR,
        },
      });
    }

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'CREATE',
      entity: 'Category',
      entityId: category.id,
      newValue: category,
    });

    return NextResponse.json({
      success: true,
      category,
      message: 'Category created successfully.',
    });
  } catch (error: any) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create category.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { id, name, description, icon, defaultWeight, includeInSPR, subcategories } = body;

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required for update.' }, { status: 400 });
    }

    const prevCategory = await prisma.category.findUnique({
      where: { id },
      include: { subcategories: true },
    });

    if (!prevCategory) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(icon ? { icon } : {}),
        ...(defaultWeight !== undefined ? { defaultWeight: Number(defaultWeight) } : {}),
        ...(includeInSPR !== undefined ? { includeInSPR: !!includeInSPR } : {}),
      },
      include: { subcategories: true },
    });

    // Update weight in categoryWeight for active academic year
    if (defaultWeight !== undefined || includeInSPR !== undefined) {
      const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
      if (currentYear) {
        await prisma.categoryWeight.upsert({
          where: {
            id: (await prisma.categoryWeight.findFirst({ where: { categoryId: id, academicYearId: currentYear.id } }))?.id || 'new_id',
          },
          update: {
            weight: Number(defaultWeight) || updatedCategory.defaultWeight,
            isIncludedInSPR: includeInSPR !== undefined ? !!includeInSPR : updatedCategory.includeInSPR,
          },
          create: {
            categoryId: id,
            academicYearId: currentYear.id,
            weight: Number(defaultWeight) || updatedCategory.defaultWeight,
            isActive: true,
            isIncludedInSPR: includeInSPR !== undefined ? !!includeInSPR : updatedCategory.includeInSPR,
          },
        });
      }
    }

    // Add new subcategories if provided
    if (subcategories && Array.isArray(subcategories)) {
      for (const sub of subcategories) {
        if (sub.id) {
          // update existing
          await prisma.subcategory.update({
            where: { id: sub.id },
            data: {
              name: sub.name.trim(),
              maxScore: Number(sub.maxScore) || 100,
            },
          });
        } else if (sub.name) {
          // create new
          const subCode = sub.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
          await prisma.subcategory.create({
            data: {
              categoryId: id,
              name: sub.name.trim(),
              code: subCode,
              maxScore: Number(sub.maxScore) || 100,
            },
          });
        }
      }
    }

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'UPDATE',
      entity: 'Category',
      entityId: id,
      previousValue: prevCategory,
      newValue: updatedCategory,
    });

    return NextResponse.json({
      success: true,
      category: updatedCategory,
      message: 'Category updated successfully.',
    });
  } catch (error: any) {
    console.error('Update category error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update category.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const subcategoryId = searchParams.get('subcategoryId');

    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch {}

    const subcategoryIds: string[] = bodyData.subcategoryIds || (subcategoryId ? [subcategoryId] : []);
    const categoryIds: string[] = bodyData.categoryIds || bodyData.ids || (id ? [id] : []);


    if (subcategoryIds.length > 0) {
      await prisma.$transaction([
        prisma.performanceRecord.deleteMany({ where: { subcategoryId: { in: subcategoryIds } } }),
        prisma.subcategory.deleteMany({ where: { id: { in: subcategoryIds } } }),
      ]);

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'DELETE',
        entity: 'Subcategory',
        newValue: { count: subcategoryIds.length, subcategoryIds },
      });

      return NextResponse.json({ success: true, message: `Successfully deleted ${subcategoryIds.length} subcategory(ies).` });
    }

    if (categoryIds.length === 0) {
      return NextResponse.json({ error: 'Category ID(s) are required for deletion.' }, { status: 400 });
    }

    const categories = await prisma.category.findMany({ where: { id: { in: categoryIds } } });
    const nonSystemCategories = categories.filter((c) => !c.isSystem);

    if (nonSystemCategories.length === 0) {
      return NextResponse.json({ error: 'Core system categories cannot be deleted.' }, { status: 400 });
    }

    const targetIds = nonSystemCategories.map((c) => c.id);

    // Cascade delete all child relationships before deleting categories
    await prisma.$transaction([
      prisma.performanceRecord.deleteMany({ where: { categoryId: { in: targetIds } } }),
      prisma.categoryWeight.deleteMany({ where: { categoryId: { in: targetIds } } }),
      prisma.subject.deleteMany({ where: { categoryId: { in: targetIds } } }),
      prisma.exam.deleteMany({ where: { categoryId: { in: targetIds } } }),
      prisma.subcategory.deleteMany({ where: { categoryId: { in: targetIds } } }),
      prisma.category.deleteMany({ where: { id: { in: targetIds } } }),
    ]);

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'DELETE',
      entity: 'Category',
      newValue: { count: targetIds.length, categoryIds: targetIds },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${targetIds.length} custom category(ies).`,
    });
  } catch (error: any) {
    console.error('Delete category error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete category.' }, { status: 500 });
  }
}

