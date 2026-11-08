import { prisma } from '../src/lib/prisma';

async function measureAllQueries() {
  const [
    subjects,
    exams,
    competitions,
    literaryComps,
    creativeCats,
    categories,
    levels,
  ] = await Promise.all([
    prisma.subject.findMany({
      select: {
        id: true,
        name: true,
        maxScore: true,
        institution: { select: { id: true, code: true, name: true } },
        board: { select: { id: true, code: true, name: true } },
      },
    }),
    prisma.exam.findMany({ select: { id: true, name: true, maxScore: true } }),
    prisma.competition.findMany({
      select: { id: true, name: true, program: { select: { id: true, name: true } } },
    }),
    prisma.literaryCompetition.findMany({
      select: {
        id: true,
        name: true,
        event: { select: { id: true, name: true } },
        level: { select: { id: true, name: true, code: true, weightMultiplier: true } },
      },
    }),
    prisma.creativeHubCategory.findMany({ where: { active: true } }),
    prisma.category.findMany({
      where: { active: true },
      include: {
        categoryWeights: true,
        subcategories: {
          where: { active: true },
          select: {
            id: true,
            categoryId: true,
            name: true,
            code: true,
            hasLevels: true,
            levelGroup: true,
            allowedLevelIds: true,
            hasMaxScore: true,
            maxScore: true,
            weight: true,
            displayOrder: true,
            active: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    }),
    prisma.level.findMany({ where: { active: true } }),
  ]);

  console.log('Lookup tables payload sizes from PostgreSQL:');
  console.log(`- subjects (${subjects.length}): ${JSON.stringify(subjects).length} bytes`);
  console.log(`- exams (${exams.length}): ${JSON.stringify(exams).length} bytes`);
  console.log(`- competitions (${competitions.length}): ${JSON.stringify(competitions).length} bytes`);
  console.log(`- literaryComps (${literaryComps.length}): ${JSON.stringify(literaryComps).length} bytes`);
  console.log(`- creativeCats (${creativeCats.length}): ${JSON.stringify(creativeCats).length} bytes`);
  console.log(`- categories (${categories.length}): ${JSON.stringify(categories).length} bytes`);
  console.log(`- levels (${levels.length}): ${JSON.stringify(levels).length} bytes`);

  const lookupTotal =
    JSON.stringify(subjects).length +
    JSON.stringify(exams).length +
    JSON.stringify(competitions).length +
    JSON.stringify(literaryComps).length +
    JSON.stringify(creativeCats).length +
    JSON.stringify(categories).length +
    JSON.stringify(levels).length;

  console.log(`Total lookup queries size: ${lookupTotal} bytes (~${(lookupTotal / 1024).toFixed(2)} KB)`);
}

measureAllQueries().catch(console.error).then(() => process.exit(0));

