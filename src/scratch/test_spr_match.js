const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/mohmmed/g, 'mohammed')
    .replace(/muhammed/g, 'muhammad')
    .replace(/[^a-z0-9]/g, '');
}

async function testMatch() {
  const students = await prisma.student.findMany({
    include: { class: true, school: true }
  });
  console.log('Total SPR students in DB:', students.length);

  const topReaders = [
    { name: 'ADHIL AMEEN', class: 'Plus Two' },
    { name: 'MUHAMMED ANSIL AP', class: 'Plus Two' },
    { name: 'CK MUHAMMED NAFEEH', class: 'Plus Two' },
    { name: 'MUHAMMED SWALIH', class: '9' },
    { name: 'MUHAMMED SAEED P', class: '10' },
    { name: 'THWUFAILUL MASHHOOD', class: 'Plus One' },
    { name: 'ABDUL MAJID P', class: '10' },
    { name: 'DHANEEN JAVAD', class: 'Plus Two' },
    { name: 'HANEEN KT', class: 'Plus Two' },
    { name: 'MUHAMMED', class: 'Plus One' },
    { name: 'MUHAMMED NABEEL KP', class: '9' },
    { name: 'MUHAMMED GHAZZALI', class: '10' },
    { name: 'MOHMMED SAHL K', class: '10' },
    { name: 'MUHAMMED LUQMAN', class: 'Plus One' },
    { name: 'MUHAMMED RISHAN', class: '9' },
  ];

  for (const reader of topReaders) {
    const rNorm = normalize(reader.name);
    let match = students.find((s) => normalize(s.fullName) === rNorm);

    if (!match) {
      const rTokens = reader.name.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
      const distinctiveTokens = rTokens.filter((w) => w !== 'MUHAMMED' && w !== 'MUHAMMAD' && w !== 'MOHAMMED' && w !== 'MOHMMED');

      if (distinctiveTokens.length > 0) {
        match = students.find((s) => {
          const sTokens = s.fullName.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
          return distinctiveTokens.every((tok) => sTokens.some((st) => st.includes(tok) || tok.includes(st)));
        });
      }
    }

    if (!match) {
      match = students.find((s) => {
        const sNorm = normalize(s.fullName);
        return sNorm.includes(rNorm) || rNorm.includes(sNorm);
      });
    }

    console.log(`Reader: "${reader.name}" (${reader.class}) -> Matched SPR: ${match ? `"${match.fullName}" (Class: ${match.class?.name || 'none'}) [ID: ${match.id}]` : '❌ NO MATCH'}`);
  }
}

testMatch()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
