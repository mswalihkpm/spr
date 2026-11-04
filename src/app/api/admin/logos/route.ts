export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { triggerSubcategoriesRevalidation } from '@/lib/cache-invalidation';
import { getSubcategoryFallbackLogo } from '@/lib/logo-utils';
import { validateImageUrl } from '@/lib/url-validator';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'private, no-cache, no-store, must-revalidate',
};

// GET: Retrieve all subcategory logos and fallback icons for Admin Logo Management
export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const subcategories = await prisma.subcategory.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        logoUrl: true,
        active: true,
        category: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [
        { category: { displayOrder: 'asc' } },
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    const logosList = subcategories.map((sub) => ({
      id: sub.id,
      name: sub.name,
      code: sub.code,
      logoUrl: sub.logoUrl,
      fallbackLogoUrl: getSubcategoryFallbackLogo(sub.code),
      effectiveLogoUrl: sub.logoUrl || getSubcategoryFallbackLogo(sub.code),
      hasCustomLogo: Boolean(sub.logoUrl),
      category: sub.category,
      active: sub.active,
    }));

    return NextResponse.json(
      { success: true, count: logosList.length, logos: logosList },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('Fetch admin logos error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logos list.' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// PATCH: Update or Remove a subcategory logo URL
export async function PATCH(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { subcategoryId, logoUrl, action } = body;

    if (!subcategoryId || typeof subcategoryId !== 'string') {
      return NextResponse.json(
        { error: 'Valid subcategoryId is required.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const existing = await prisma.subcategory.findUnique({
      where: { id: subcategoryId },
      select: { id: true, name: true, code: true, logoUrl: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Subcategory not found.' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // Action: REMOVE logo (reset to null)
    if (action === 'REMOVE' || logoUrl === null || logoUrl === '') {
      const updated = await prisma.subcategory.update({
        where: { id: subcategoryId },
        data: { logoUrl: null },
        select: { id: true, name: true, code: true, logoUrl: true },
      });

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'UPDATE',
        entity: 'Subcategory',
        entityId: subcategoryId,
        previousValue: { logoUrl: existing.logoUrl },
        newValue: { logoUrl: null, action: 'REMOVE_LOGO' },
      });

      triggerSubcategoriesRevalidation();

      return NextResponse.json(
        {
          success: true,
          message: `Logo removed for "${existing.name}". Default fallback icon will now be displayed.`,
          logo: {
            id: updated.id,
            name: updated.name,
            code: updated.code,
            logoUrl: null,
            fallbackLogoUrl: getSubcategoryFallbackLogo(updated.code),
            effectiveLogoUrl: getSubcategoryFallbackLogo(updated.code),
            hasCustomLogo: false,
          },
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // Action: UPDATE / REPLACE logo URL
    const validation = validateImageUrl(logoUrl);
    if (!validation.valid || !validation.sanitizedUrl) {
      return NextResponse.json(
        { error: validation.error || 'Invalid logo image URL.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const newUrl = validation.sanitizedUrl;

    const updated = await prisma.subcategory.update({
      where: { id: subcategoryId },
      data: { logoUrl: newUrl },
      select: { id: true, name: true, code: true, logoUrl: true },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'UPDATE',
      entity: 'Subcategory',
      entityId: subcategoryId,
      previousValue: { logoUrl: existing.logoUrl },
      newValue: { logoUrl: newUrl, action: 'UPDATE_LOGO' },
    });

    triggerSubcategoriesRevalidation();

    return NextResponse.json(
      {
        success: true,
        message: `Logo URL updated successfully for "${existing.name}".`,
        logo: {
          id: updated.id,
          name: updated.name,
          code: updated.code,
          logoUrl: updated.logoUrl,
          fallbackLogoUrl: getSubcategoryFallbackLogo(updated.code),
          effectiveLogoUrl: updated.logoUrl,
          hasCustomLogo: true,
        },
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('Update admin logo error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update logo URL.' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

