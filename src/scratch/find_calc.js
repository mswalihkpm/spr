const fs = require('fs');

const js = fs.readFileSync('src/scratch/lib_bundle.js', 'utf8');

// Look for 'leaderboard' page component
const matches = [];
const regex = /from "admin_settings"|borrow_records|full_read|half_read/g;
let m;
while ((m = regex.exec(js)) !== null) {
  matches.push({ index: m.index, match: m[0] });
}

console.log('Matches:', matches.length);

for (const item of matches) {
  const start = Math.max(0, item.index - 300);
  const end = Math.min(js.length, item.index + 500);
  console.log(`=== Match ${item.match} @ ${item.index} ===`);
  console.log(js.slice(start, end));
}
