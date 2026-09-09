const fs = require('fs');

const js = fs.readFileSync('src/scratch/lib_bundle.js', 'utf8');

// Find Q6
const idx = js.indexOf('function Q6');
if (idx !== -1) {
  console.log('--- Q6 ---');
  console.log(js.slice(idx, idx + 600));
} else {
  const reg = /Q6\s*=\s*/g;
  let m = reg.exec(js);
  if (m) {
    console.log('--- Q6 assign ---');
    console.log(js.slice(m.index - 50, m.index + 500));
  }
}
