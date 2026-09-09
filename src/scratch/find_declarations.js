const fs = require('fs');

const js = fs.readFileSync('src/scratch/lib_bundle.js', 'utf8');

// Find ig()
const idx = js.indexOf('Promise.all([ig(),nx(),Qs(),_h(),VF()])');
console.log('Found call at:', idx);

// Search for "ig=" or "ig = " or function ig
const words = ['ig', 'nx', 'Qs', '_h', 'VF', 'vK', 'Q6'];
for (const w of words) {
  const reg = new RegExp(`(?:const|let|var|function)\\s+${w}\\b`, 'g');
  let m = reg.exec(js);
  if (m) {
    console.log(`Found declaration of ${w} at ${m.index}:`);
    console.log(js.slice(m.index, m.index + 300));
  }
}
