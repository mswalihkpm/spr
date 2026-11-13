import { prisma } from './prisma';

let cachedCreativeCategories: { timestamp: number; data: any } | null = null;
let cachedPublishedMedia: { timestamp: number; data: any } | null = null;
const MASTER_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export function invalidateCreativeHubMasterCache() {
  cachedCreativeCategories = null;
  cachedPublishedMedia = null;
}

export async function getCachedCreativeCategoriesData() {
  const now = Date.now();
  if (cachedCreativeCategories && now - cachedCreativeCategories.timestamp < MASTER_CACHE_TTL) {
    return cachedCreativeCategories.data;
  }
  const categories = await prisma.creativeHubCategory.findMany({
    where: { active: true },
    select: { id: true, name: true, code: true, weight: true },
    orderBy: { name: 'asc' },
  });
  cachedCreativeCategories = { timestamp: now, data: categories };
  return categories;
}

export async function getCachedPublishedMediaData() {
  const now = Date.now();
  if (cachedPublishedMedia && now - cachedPublishedMedia.timestamp < MASTER_CACHE_TTL) {
    return cachedPublishedMedia.data;
  }
  const media = await prisma.publishedMedia.findMany({
    where: { active: true },
    select: { id: true, name: true, code: true, weight: true },
    orderBy: { name: 'asc' },
  });
  cachedPublishedMedia = { timestamp: now, data: media };
  return media;
}

