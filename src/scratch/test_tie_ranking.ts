import { describe, it } from 'node:test';
import assert from 'node:assert';

function computeTiedRanks(entries: { name: string; spr: number; recordsCount?: number }[]) {
  const rankedEntries = [...entries];

  rankedEntries.sort((a, b) => {
    if (b.spr !== a.spr) return b.spr - a.spr;
    if ((b.recordsCount || 0) !== (a.recordsCount || 0)) {
      return (b.recordsCount || 0) - (a.recordsCount || 0);
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  const withRanks: any[] = rankedEntries.map((e) => ({ ...e, rank: 0 }));

  for (let i = 0; i < withRanks.length; i++) {
    if (i > 0 && withRanks[i].spr === withRanks[i - 1].spr) {
      withRanks[i].rank = withRanks[i - 1].rank;
    } else {
      withRanks[i].rank = i + 1;
    }
  }

  const scoreCounts: Record<number, number> = {};
  withRanks.forEach((e) => {
    scoreCounts[e.spr] = (scoreCounts[e.spr] || 0) + 1;
  });
  withRanks.forEach((e) => {
    e.isTied = scoreCounts[e.spr] > 1;
    e.tiedCount = scoreCounts[e.spr];
  });

  return withRanks;
}

const mockStudents = [
  { name: 'AHAMMAD SINAN K', spr: 100 },
  { name: 'MUHAMMED ISMAYIL MK', spr: 100 },
  { name: 'UMAR ABDULLA KAMIL V A', spr: 95.4 },
  { name: 'MUHAMMED SUFYAN PN', spr: 86.96 },
  { name: 'MUHAMMAD RASAL AP', spr: 85.84 },
  { name: 'MUHAMMAD SINAN N', spr: 85.75 },
  { name: 'MUHAMMED AZEEM MK', spr: 85.28 },
  { name: 'MUHAMMED ASAD', spr: 84.31 },
  { name: 'MUHAMMED AYMAN M', spr: 84.31 },
  { name: 'MUHAMMED MIDLAJ KS', spr: 81.67 },
];

const results = computeTiedRanks(mockStudents);
console.log('--- TEST RESULTS FOR TIED RANKS ---');
results.forEach((r) => {
  console.log(`Rank ${r.rank}: ${r.name} - SPR: ${r.spr}% (Tied: ${r.isTied}, TiedCount: ${r.tiedCount})`);
});

assert.strictEqual(results[0].rank, 1, 'First student must be rank 1');
assert.strictEqual(results[0].isTied, true, 'First student must be marked as tied');
assert.strictEqual(results[1].rank, 1, 'Second student must ALSO be rank 1');
assert.strictEqual(results[1].isTied, true, 'Second student must be marked as tied');
assert.strictEqual(results[2].rank, 3, 'Third student must be rank 3 in standard competition ranking');
assert.strictEqual(results[2].isTied, false, 'Third student is not tied');
assert.strictEqual(results[7].rank, 8, 'Eighth student must be rank 8');
assert.strictEqual(results[8].rank, 8, 'Ninth student must ALSO be rank 8');
assert.strictEqual(results[9].rank, 10, 'Tenth student must be rank 10');

console.log('✅ ALL TIE-RANKING ASSERTIONS PASSED!');
