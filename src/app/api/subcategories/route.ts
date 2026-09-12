export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { invalidateEngineCache } from '@/lib/spr-engine';

// GET all subcategories
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');

    const whereClause: any = {};
    if (categoryId) {
      whereClause.OR = [
        { categoryId: categoryId },
        { category: { code: categoryId.toUpperCase() } },
        { category: { id: categoryId } },
      ];
    }

    const subcategories = await prisma.subcategory.findMany({
      where: whereClause,
      include: {
        category: true,
        _count: { select: { performanceRecords: true } },
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json({ subcategories });
  } catch (error: any) {
    console.error('Fetch subcategories error:', error);
    return NextResponse.json({ error: 'Failed to fetch subcategories.' }, { status: 500 });
  }
}

// POST create subcategory
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const {
      categoryId,
      name,
      code,
      logoUrl,
      hasLevels,
      levelGroup,
      allowedLevelIds,
      hasMaxScore,
      maxScore,
      weight,
      displayOrder,
      active,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Subcategory name is required.' }, { status: 400 });
    }

    let targetCategoryId = categoryId;
    if (!targetCategoryId) {
      // Default to QUALIFICATION or first category
      const qualCat = await prisma.category.findUnique({ where: { code: 'QUALIFICATION' } });
      const firstCat = await prisma.category.findFirst();
      targetCategoryId = qualCat?.id || firstCat?.id;
    }

    if (!targetCategoryId) {
      return NextResponse.json({ error: 'Valid category must exist.' }, { status: 400 });
    }

    const subCode =
      (code || name).toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 20) +
      `_${Date.now().toString(36).slice(-4).toUpperCase()}`;

    const subcategory = await prisma.subcategory.create({
      data: {
        categoryId: targetCategoryId,
        name: name.trim(),
        code: subCode,
        logoUrl: logoUrl || null,
        hasLevels: Boolean(hasLevels),
        levelGroup: levelGroup || 'ALL',
        allowedLevelIds: allowedLevelIds ? (typeof allowedLevelIds === 'string' ? allowedLevelIds : JSON.stringify(allowedLevelIds)) : null,
        hasMaxScore: hasMaxScore !== undefined ? Boolean(hasMaxScore) : true,
        maxScore: Number(maxScore) || 100.0,
        weight: Number(weight) || 1.0,
        displayOrder: Number(displayOrder) || 0,
        active: active !== undefined ? Boolean(active) : true,
      },
      include: { category: true },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'CREATE',
      entity: 'Subcategory',
      entityId: subcategory.id,
      newValue: subcategory,
    });

    invalidateEngineCache();

    return NextResponse.json({ success: true, subcategory });
  } catch (error: any) {
    console.error('Create subcategory error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create subcategory.' }, { status: 500 });
  }
}

// PUT update subcategory
export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();

    if (body.reorder && Array.isArray(body.reorder)) {
      for (const item of body.reorder) {
        if (item.id) {
          await prisma.subcategory.update({
            where: { id: item.id },
            data: { displayOrder: Number(item.displayOrder) || 0 },
          });
        }
      }
      invalidateEngineCache();
      return NextResponse.json({ success: true, message: 'Subcategory priorities updated successfully.' });
    }

    const {
      id,
      categoryId,
      name,
      logoUrl,
      hasLevels,
      levelGroup,
      allowedLevelIds,
      hasMaxScore,
      maxScore,
      weight,
      displayOrder,
      active,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Subcategory ID is required.' }, { status: 400 });
    }

    const existing = await prisma.subcategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Subcategory not found.' }, { status: 404 });
    }

    const updated = await prisma.subcategory.update({
      where: { id },
      data: {
        ...(categoryId ? { categoryId } : {}),
        ...(name ? { name: name.trim() } : {}),
        logoUrl: logoUrl !== undefined ? logoUrl : undefined,
        ...(hasLevels !== undefined ? { hasLevels: Boolean(hasLevels) } : {}),
        ...(levelGroup !== undefined ? { levelGroup: levelGroup || 'ALL' } : {}),
        ...(allowedLevelIds !== undefined
          ? {
              allowedLevelIds: allowedLevelIds
                ? typeof allowedLevelIds === 'string'
                  ? allowedLevelIds
                  : JSON.stringify(allowedLevelIds)
                : null,
            }
          : {}),
        ...(hasMaxScore !== undefined ? { hasMaxScore: Boolean(hasMaxScore) } : {}),
        ...(maxScore !== undefined ? { maxScore: Number(maxScore) } : {}),
        ...(weight !== undefined ? { weight: Number(weight) } : {}),
        ...(displayOrder !== undefined ? { displayOrder: Number(displayOrder) } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
      },
      include: { category: true },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'UPDATE',
      entity: 'Subcategory',
      entityId: id,
      previousValue: existing,
      newValue: updated,
    });

    invalidateEngineCache();

    return NextResponse.json({ success: true, subcategory: updated });
  } catch (error: any) {
    console.error('Update subcategory error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update subcategory.' }, { status: 500 });
  }
}

// DELETE subcategory (Safe cascade)
export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body not JSON or empty
    }

    const idsSet = new Set<string>();

    if (idParam) idsSet.add(idParam.trim());
    if (idsParam) idsParam.split(',').forEach((s) => s.trim() && idsSet.add(s.trim()));
    if (body.id) idsSet.add(String(body.id).trim());
    if (Array.isArray(body.ids)) {
      body.ids.forEach((s: any) => s && idsSet.add(String(s).trim()));
    } else if (typeof body.ids === 'string') {
      body.ids.split(',').forEach((s: string) => s.trim() && idsSet.add(s.trim()));
    }
    if (Array.isArray(body.subcategoryIds)) {
      body.subcategoryIds.forEach((s: any) => s && idsSet.add(String(s).trim()));
    }

    const idsToDelete = Array.from(idsSet);

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'Subcategory ID(s) are required for deletion.' }, { status: 400 });
    }

    const existingSubcategories = await prisma.subcategory.findMany({
      where: { id: { in: idsToDelete } },
    });

    if (existingSubcategories.length === 0) {
      return NextResponse.json({ success: true, message: 'Subcategories already removed.' });
    }

    const validIds = existingSubcategories.map((s) => s.id);

    const [deleteRecordsResult, deleteSubcategoriesResult] = await prisma.$transaction([
      prisma.performanceRecord.deleteMany({ where: { subcategoryId: { in: validIds } } }),
      prisma.subcategory.deleteMany({ where: { id: { in: validIds } } }),
    ]);

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'BULK_DELETE',
      entity: 'Subcategory',
      newValue: { count: deleteSubcategoriesResult.count, ids: validIds, deletedRecords: deleteRecordsResult.count },
    });

    invalidateEngineCache();

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteSubcategoriesResult.count} subcategory(ies) and associated scores.`,
      count: deleteSubcategoriesResult.count,
      deletedCount: deleteSubcategoriesResult.count,
    });
  } catch (error: any) {
    console.error('Delete subcategory error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete subcategory.' }, { status: 500 });
  }
}

