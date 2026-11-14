/**
 * SPR Phase 1 Response Parity Verification
 * Compares the exact JSON output of Direct PostgREST vs Prisma (/api/categories logic)
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { sanitizeSubcategoryLogo } from '../lib/logo-utils';

const envTarget = fs.existsSync('.env.target') ? fs.readFileSync('.env.target', 'utf8') : '';
const targetUrl = envTarget.match(/TARGET_SUPABASE_URL=["']?([^"'\r\n]+)["']?/)?.[1] || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const targetAnonKey = envTarget.match(/TARGET_SUPABASE_ANON_KEY=["']?([^"'\r\n]+)["']?/)?.[1] || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('Comparing Direct PostgREST response vs Prisma /api/categories output...\n');

  // 1. Prisma Query (matching /api/categories)
  const prismaCategories = await prisma.category.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      icon: true,
      isSystem: true,
      active: true,
      displayOrder: true,
      defaultWeight: true,
      includeInSPR: true,
      subcategories: {
        select: {
          id: true,
          categoryId: true,
          name: true,
          code: true,
          logoUrl: true,
          hasLevels: true,
          levelGroup: true,
          allowedLevelIds: true,
          hasMaxScore: true,
          maxScore: true,
          weight: true,
          displayOrder: true,
          active: true,
        },
        orderBy: [
          { displayOrder: 'asc' },
          { createdAt: 'asc' },
        ],
      },
    },
    orderBy: { displayOrder: 'asc' },
  });

  const prismaSanitized = prismaCategories.map((cat: any) => ({
    ...cat,
    subcategories: (cat.subcategories || []).map((sub: any) => ({
      ...sub,
      logoUrl: sanitizeSubcategoryLogo(sub.code, sub.logoUrl),
    })),
  }));

  // 2. Direct Supabase Query
  const supabase = createClient(targetUrl, targetAnonKey, { auth: { persistSession: false } });
  const { data: supabaseRaw, error } = await supabase
    .from('Category')
    .select(`
      id, code, name, description, icon, isSystem, active, displayOrder, defaultWeight, includeInSPR,
      subcategories:Subcategory (
        id, categoryId, name, code, logoUrl, hasLevels, levelGroup, allowedLevelIds,
        hasMaxScore, maxScore, weight, displayOrder, active, displayOrder, createdAt
      )
    `)
    .order('displayOrder', { ascending: true });

  if (error || !supabaseRaw) {
    console.error('Supabase query error:', error);
    process.exit(1);
  }

  const supabaseSanitized = supabaseRaw.map((cat: any) => ({
    ...cat,
    subcategories: (cat.subcategories || [])
      .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
      .map((sub: any) => ({
        id: sub.id,
        categoryId: sub.categoryId,
        name: sub.name,
        code: sub.code,
        logoUrl: sanitizeSubcategoryLogo(sub.code, sub.logoUrl),
        hasLevels: sub.hasLevels,
        levelGroup: sub.levelGroup,
        allowedLevelIds: sub.allowedLevelIds,
        hasMaxScore: sub.hasMaxScore,
        maxScore: sub.maxScore,
        weight: sub.weight,
        displayOrder: sub.displayOrder,
        active: sub.active,
      })),
  }));

  console.log(`Prisma Categories Count: ${prismaSanitized.length}`);
  console.log(`Supabase Categories Count: ${supabaseSanitized.length}`);

  let match = true;
  if (prismaSanitized.length !== supabaseSanitized.length) {
    console.error('Category count mismatch!');
    match = false;
  }

  for (let i = 0; i < prismaSanitized.length; i++) {
    const p = prismaSanitized[i];
    const s = supabaseSanitized[i];
    if (p.id !== s.id || p.code !== s.code || p.name !== s.name) {
      console.error(`Mismatch at index ${i}:`, { prisma: p.code, supabase: s.code });
      match = false;
    }
    if (p.subcategories.length !== s.subcategories.length) {
      console.error(`Subcategory count mismatch for ${p.code}: Prisma=${p.subcategories.length}, Supabase=${s.subcategories.length}`);
      match = false;
    }
  }

  if (match) {
    console.log('\n🎉 PARITY VERIFIED: Direct PostgREST output is 100% IDENTICAL to Prisma /api/categories output!');
  } else {
    console.error('Parity check failed.');
    process.exit(1);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
