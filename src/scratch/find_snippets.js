const fs = require('fs');

const js = fs.readFileSync('src/scratch/lib_bundle.js', 'utf8');

// Look for leaderboard or borrow_records or scoring
const matches = [];
const regex = /leaderboard/gi;
let m;
while ((m = regex.exec(js)) !== null) {
  matches.push(m.index);
}
console.log('Matches count:', matches.length);

for (const idx of matches.slice(0, 10)) {
  const start = Math.max(0, idx - 200);
  const end = Math.min(js.length, idx + 400);
  console.log('--- SNIPPET @', idx, '---');
  console.log(js.slice(start, end));
}
