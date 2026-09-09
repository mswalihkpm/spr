const fs = require('fs');

const js = fs.readFileSync('src/scratch/lib_bundle.js', 'utf8');
const snippet = js.slice(2680000, 2700000);
fs.writeFileSync('src/scratch/leaderboard_bundle_part.js', snippet);
console.log('Saved snippet, length:', snippet.length);
