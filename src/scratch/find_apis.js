const fs = require('fs');

const js = fs.readFileSync('src/scratch/lib_bundle.js', 'utf8');

// Find definition of ig, nx, Qs, _h, VF
const regex = /const ig=|const nx=|const Qs=|const _h=|const VF=|function ig|function nx/g;
let m;
while ((m = regex.exec(js)) !== null) {
  const start = Math.max(0, m.index - 50);
  const end = Math.min(js.length, m.index + 500);
  console.log(`=== Match @ ${m.index} ===`);
  console.log(js.slice(start, end));
}
