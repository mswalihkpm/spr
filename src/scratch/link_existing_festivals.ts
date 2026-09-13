import { prisma } from '../lib/prisma';
import { invalidateEngineCache } from '../lib/spr-engine';

async function main() {
  console.log('--- Linking existing festival records with subcategories ---');
  
  // 1. Fetch Sahityotsav subcategory
  const sahityotsavSub = await prisma.subcategory.findFirst({
    where: { code: 'SAHITYOTSAV' },
  });
  console.log('Sahityotsav subcategory:', sahityotsavSub);

  // 2. Fetch or create Sahityotsav 2026 event
  let sahityotsavEvent = await prisma.literaryEvent.findFirst({
    where: { name: { equals: 'Sahityotsav 2026', mode: 'insensitive' } },
  });
  if (!sahityotsavEvent) {
    const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } }) || await prisma.academicYear.findFirst();
    sahityotsavEvent = await prisma.literaryEvent.create({
      data: {
        name: 'Sahityotsav 2026',
        code: `EVENT_SAHITYOTSAV_2026_${Date.now().toString(36).slice(-3)}`,
        academicYearId: currentYear!.id,
      },
    });
  }
  console.log('Sahityotsav Event:', sahityotsavEvent);

  // 3. Update existing 5 performance records
  const litRecords = await prisma.performanceRecord.findMany({
    where: { category: { code: 'LITERARY' } },
    include: { literaryCompetition: true },
  });
  console.log(`Found ${litRecords.length} literary performance records.`);

  for (const r of litRecords) {
    // If literaryCompetition points to generic 'Festival', link it or update eventId
    if (r.literaryCompetition) {
      await prisma.literaryCompetition.update({
        where: { id: r.literaryCompetition.id },
        data: {
          eventId: sahityotsavEvent.id,
        },
      });
    }

    await prisma.performanceRecord.update({
      where: { id: r.id },
      data: {
        subcategoryId: sahityotsavSub?.id || null,
      },
    });
  }

  invalidateEngineCache();
  console.log('Successfully updated existing performance records and cleared cache.');
}

main().catch(console.error);
