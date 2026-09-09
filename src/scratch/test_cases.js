const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/mohmmed/g, 'mohammed')
    .replace(/muhammed/g, 'muhammad')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeClass(cls) {
  if (!cls) return '';
  const c = cls.toString().toLowerCase().trim();
  if (c.includes('plus two') || c.includes('+2') || c.includes('12') || c.includes('plus 2') || c.includes('plustwo')) return '+2';
  if (c.includes('plus one') || c.includes('+1') || c.includes('11') || c.includes('plus 1') || c.includes('plusone')) return '+1';
  if (c.includes('10')) return '10';
  if (c.includes('9')) return '9';
  if (c.includes('8')) return '8';
  if (c.includes('7')) return '7';
  return c.replace(/[^a-z0-9]/g, '');
}

function matchStudent(readerName, readerClass, allStudents) {
  const rNorm = normalize(readerName);
  const rClassNorm = normalizeClass(readerClass);

  // 1. Exact normalized full name match with class preference
  const exactMatches = allStudents.filter((s) => normalize(s.fullName) === rNorm);
  if (exactMatches.length === 1 && (!rClassNorm || normalizeClass(exactMatches[0].class?.name) === rClassNorm)) {
    return exactMatches[0];
  }
  if (exactMatches.length > 0 && rClassNorm) {
    const classMatch = exactMatches.find((s) => normalizeClass(s.class?.name) === rClassNorm);
    if (classMatch) return classMatch;
  }

  // Tokenize
  const rWords = readerName.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const rMainWords = rWords.filter((w) => !['MUHAMMED', 'MUHAMMAD', 'MOHAMMED', 'MOHMMED', 'SAYYID'].includes(w) && w.length >= 3);
  const rInitials = rWords.filter((w) => w.length < 3 || ['MUHAMMED', 'MUHAMMAD', 'MOHAMMED', 'MOHMMED', 'SAYYID'].includes(w));

  let bestMatch = null;
  let highestScore = 0;

  for (const s of allStudents) {
    const sNorm = normalize(s.fullName);
    const sClassNorm = normalizeClass(s.class?.name);
    const sWords = s.fullName.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const sMainWords = sWords.filter((w) => !['MUHAMMED', 'MUHAMMAD', 'MOHAMMED', 'MOHMMED', 'SAYYID'].includes(w) && w.length >= 3);

    let score = 0;

    // Check if main distinctive words match
    let mainWordsMatched = 0;
    for (const mw of rMainWords) {
      if (sMainWords.some((sw) => sw === mw || sw.startsWith(mw) || mw.startsWith(sw) || (mw.length > 4 && sw.includes(mw)) || (sw.length > 4 && mw.includes(sw)))) {
        mainWordsMatched++;
        score += 15;
      }
    }

    if (rMainWords.length > 0 && mainWordsMatched === rMainWords.length) {
      score += 25; // Full main name match
    } else if (rMainWords.length > 0 && mainWordsMatched === 0) {
      const fuzzyMatch = rMainWords.some(mw => sMainWords.some(sw => {
        if (mw.replace(/^H/, '') === sw.replace(/^H/, '')) return true;
        return false;
      }));
      if (fuzzyMatch) {
        score += 15;
      } else {
        continue;
      }
    }

    // Check class match
    if (rClassNorm && sClassNorm) {
      if (rClassNorm === sClassNorm) {
        score += 20;
      } else {
        score -= 30; // Heavy penalty for class mismatch
      }
    }

    // Check initials
    for (const init of rInitials) {
      if (sWords.includes(init)) score += 2;
    }

    if (score > highestScore && score >= 20) {
      highestScore = score;
      bestMatch = s;
    }
  }

  return bestMatch;
}

async function testCases() {
  const students = await prisma.student.findMany({
    include: { class: true }
  });

  const tests = [
    { name: 'BISHRUL HAFI', class: 'Plus Two' },
    { name: 'ARSHAD KC', class: '9' },
    { name: 'MUHAMMED SINAN K', class: 'Plus Two' },
    { name: 'ADHIL AMEEN', class: 'Plus Two' },
    { name: 'MUHAMMED SWALIH', class: '9' },
    { name: 'MUHAMMED SWALIH MT', class: 'Plus Two' },
  ];

  for (const t of tests) {
    const m = matchStudent(t.name, t.class, students);
    console.log(`${t.name} (${t.class}) -> ${m ? `${m.fullName} (${m.class?.name})` : 'NO MATCH'}`);
  }
}

testCases().catch(console.error).finally(() => prisma.$disconnect());
