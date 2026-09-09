const fs = require('fs');

const js = fs.readFileSync('src/scratch/lib_bundle.js', 'utf8');

// Find nx, Qs, _h, VF
for (const fnName of ['nx', 'Qs', '_h', 'VF']) {
  const reg = new RegExp(`${fnName}\\s*=\\s*async`, 'g');
  let m = reg.exec(js);
  if (m) {
    console.log(`--- ${fnName} ---`);
    console.log(js.slice(m.index, m.index + 400));
  }
}
