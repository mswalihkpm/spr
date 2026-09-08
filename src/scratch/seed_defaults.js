const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding updated platform defaults...');

  // 1. Ensure QUALIFICATION Category exists
  const qualCat = await prisma.category.upsert({
    where: { code: 'QUALIFICATION' },
    update: { name: 'Qualification', active: true },
    create: {
      code: 'QUALIFICATION',
      name: 'Qualification',
      description: 'Certifications, Hifz, Language Proficiency, and External Qualifications',
      icon: 'award',
      isSystem: true,
      active: true,
      displayOrder: 7,
      defaultWeight: 10.0,
      includeInSPR: true,
    },
  });
  console.log('Qualification Category:', qualCat.name);

  // 2. Ensure CategoryWeights exist for all categories
  const allCats = await prisma.category.findMany();
  for (const c of allCats) {
    const existingWeight = await prisma.categoryWeight.findFirst({
      where: { categoryId: c.id },
    });
    if (!existingWeight) {
      await prisma.categoryWeight.create({
        data: {
          categoryId: c.id,
          weight: c.defaultWeight || 10.0,
          isActive: true,
          isIncludedInSPR: c.includeInSPR ?? true,
        },
      });
    }
  }

  // 3. Ensure Levels exist (Division, District, State, National, Sub-district, Daaera, Jamia, Campus, School)
  const defaultLevels = [
    { name: 'Campus', code: 'CAMPUS', weightMultiplier: 1.0, displayOrder: 1 },
    { name: 'School', code: 'SCHOOL', weightMultiplier: 1.0, displayOrder: 2 },
    { name: 'Kulliya', code: 'KULLIYA', weightMultiplier: 1.0, displayOrder: 3 },
    { name: 'Daaera', code: 'DAAERA', weightMultiplier: 1.0, displayOrder: 4 },
    { name: 'Division', code: 'DIVISION', weightMultiplier: 1.0, displayOrder: 5 },
    { name: 'Sub-district', code: 'SUB_DISTRICT', weightMultiplier: 1.0, displayOrder: 6 },
    { name: 'District', code: 'DISTRICT', weightMultiplier: 1.25, displayOrder: 7 },
    { name: 'Jamia', code: 'JAMIA', weightMultiplier: 1.5, displayOrder: 8 },
    { name: 'State', code: 'STATE', weightMultiplier: 1.5, displayOrder: 9 },
    { name: 'National', code: 'NATIONAL', weightMultiplier: 2.0, displayOrder: 10 },
    { name: 'International', code: 'INTERNATIONAL', weightMultiplier: 2.5, displayOrder: 11 },
  ];

  for (const lvl of defaultLevels) {
    await prisma.level.upsert({
      where: { name: lvl.name },
      update: { weightMultiplier: lvl.weightMultiplier, displayOrder: lvl.displayOrder },
      create: lvl,
    });
  }
  console.log('Levels verified.');

  // 4. Ensure CreativeHubCategory default forms
  const defaultCreativeForms = [
    { name: 'Poem', code: 'POEM', weight: 1.0 },
    { name: 'Story', code: 'STORY', weight: 1.2 },
    { name: 'Article', code: 'ARTICLE', weight: 1.5 },
    { name: 'Letter', code: 'LETTER', weight: 1.0 },
    { name: 'Response', code: 'RESPONSE', weight: 1.0 },
    { name: 'Book Review', code: 'BOOK_REVIEW', weight: 1.2 },
    { name: 'Research Paper', code: 'RESEARCH_PAPER', weight: 2.0 },
    { name: 'Others', code: 'OTHERS', weight: 1.0 },
  ];

  for (const form of defaultCreativeForms) {
    await prisma.creativeHubCategory.upsert({
      where: { name: form.name },
      update: { weight: form.weight },
      create: form,
    });
  }
  console.log('Creative forms verified.');

  // 5. Ensure PublishedMedia default options
  const defaultMedia = [
    { name: 'National Daily Newspaper', code: 'NEWSPAPER_NAT', weight: 2.0 },
    { name: 'Regional Newspaper', code: 'NEWSPAPER_REG', weight: 1.5 },
    { name: 'International Journal', code: 'JOURNAL_INT', weight: 2.5 },
    { name: 'Peer-reviewed Magazine', code: 'MAGAZINE', weight: 1.5 },
    { name: 'Institutional Wall Magazine', code: 'WALL_MAGAZINE', weight: 1.0 },
    { name: 'Digital Portal / Blog', code: 'DIGITAL_PORTAL', weight: 1.0 },
    { name: 'Book / Anthology Publication', code: 'BOOK_PUB', weight: 2.0 },
  ];

  for (const m of defaultMedia) {
    await prisma.publishedMedia.upsert({
      where: { name: m.name },
      update: { weight: m.weight },
      create: m,
    });
  }
  console.log('Published Media verified.');

  // 6. Ensure sample News exists if none
  const newsCount = await prisma.news.count();
  if (newsCount === 0) {
    await prisma.news.createMany({
      data: [
        {
          title: 'Sahityotsav 2026 Grand Competitions Announced',
          subtitle: 'Division and State level selection rounds commence this week',
          body: 'The annual Sahityotsav literary festival 2026 has been officially inaugurated. Students from all divisions will compete in Malayalam, Arabic, English, and Urdu essay, speech, and recitation events. All scores and rankings will reflect in the Student Performance Rate (SPR) portal in real time.',
          publishedAt: new Date(),
          active: true,
        },
        {
          title: 'Academic Term 1 Results & SPR Leaderboard Updated',
          subtitle: 'Islamic & School Studies examination ratings published',
          body: 'Term 1 examination scores across Islamic studies, syllabus boards, and comprehensive assessments have been compiled. Students and guardians can view individual verified scorecards and print official A4 dossiers directly from the portal.',
          publishedAt: new Date(Date.now() - 86400000),
          active: true,
        },
        {
          title: 'Creative Hub Call for Submissions: Innovation & Arts',
          subtitle: 'Earn SPR points for published articles, poems, and journals',
          body: 'Madin School of Excellence announces the opening of the Creative Hub quarterly accreditation. Students whose works are featured in newspapers, institutional periodicals, or international journals will be awarded dedicated SPR weighting.',
          publishedAt: new Date(Date.now() - 172800000),
          active: true,
        },
      ],
    });
    console.log('Sample news created.');
  }

  console.log('Seed completed successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
