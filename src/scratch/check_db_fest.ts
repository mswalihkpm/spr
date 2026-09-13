import { prisma } from '../lib/prisma';

async function main() {
  const cats = await prisma.category.findMany({ include: { subcategories: true } });
  console.log('Categories & Subcategories:');
  cats.forEach(c => {
    console.log(c.code, c.name, 'Subcategories:', c.subcategories.map(s => ({ id: s.id, name: s.name, code: s.code })));
  });
  const events = await prisma.literaryEvent.findMany({ include: { competitions: true } });
  console.log('Literary Events:', events.map(e => ({ id: e.id, name: e.name, comps: e.competitions.map(c => c.name) })));
  const records = await prisma.performanceRecord.findMany({
    where: { category: { code: 'LITERARY' } },
    include: { student: true, literaryCompetition: { include: { event: true } }, level: true, subcategory: true }
  });
  console.log('Literary Performance Records Count:', records.length);
  records.slice(0, 10).forEach(r => {
    console.log({
      id: r.id,
      student: r.student.fullName,
      comp: r.literaryCompetition?.name,
      event: r.literaryCompetition?.event?.name,
      subcat: r.subcategory?.name,
      level: r.level?.name,
      pos: r.position,
      score: r.obtainedScore,
      pct: r.percentage,
      remarks: r.remarks
    });
  });
}

main().catch(console.error);
