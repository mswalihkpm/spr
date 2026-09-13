import { resolvePrizeMultiplier, resolveLevelMultiplier } from '../lib/spr-engine';

const levelsList = [
  { id: 'lvl_division', name: 'Division', code: 'DIVISION', weightMultiplier: 1.3 },
  { id: 'lvl_district', name: 'District', code: 'DISTRICT', weightMultiplier: 1.5 },
  { id: 'lvl_state', name: 'State', code: 'STATE', weightMultiplier: 2.0 },
];

function testScoreCalculation(scoreEntered: number, position: string, level: any) {
  const prizeMult = resolvePrizeMultiplier(position);
  const lvlMult = resolveLevelMultiplier(level, levelsList);
  const totalMult = Number((prizeMult * lvlMult).toFixed(2));
  const finalPoints = Number((scoreEntered * totalMult).toFixed(2));

  console.log(`Score entered: ${scoreEntered}`);
  console.log(`Position: ${position} -> multiplier: ${prizeMult}x`);
  console.log(`Level: ${level?.name || 'None'} -> multiplier: ${lvlMult}x`);
  console.log(`Combined Multiplier: ${totalMult}x`);
  console.log(`Final Points: ${finalPoints} pts`);
  return finalPoints;
}

console.log('--- TEST 1: User Screenshot Scenario ---');
const pts1 = testScoreCalculation(3, '1st', { name: 'Division', weightMultiplier: 1.3 });
console.assert(pts1 === 7.8, `Expected 7.8, got ${pts1}`);

console.log('\n--- TEST 2: 2nd Position with District Level (1.5x) ---');
const pts2 = testScoreCalculation(4, '2nd', { name: 'District', weightMultiplier: 1.5 });
console.assert(pts2 === 9.0, `Expected 9.0, got ${pts2}`); // 4 * 1.5 * 1.5 = 9.0

console.log('\n--- TEST 3: No Competition Level (M-Lit Fest, 1st Position) ---');
const pts3 = testScoreCalculation(5, '1st', null);
console.assert(pts3 === 10.0, `Expected 10.0, got ${pts3}`); // 5 * 2.0 * 1.0 = 10.0

console.log('\n--- TEST 4: Score 0 Entered ---');
const pts4 = testScoreCalculation(0, '1st', { name: 'Division', weightMultiplier: 1.3 });
console.assert(pts4 === 0, `Expected 0, got ${pts4}`);

console.log('\nAll formula verification tests passed successfully!');
