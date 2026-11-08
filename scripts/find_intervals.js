const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) results = results.concat(walk(full));
    else if (file.endsWith('.ts') || file.endsWith('.tsx')) results.push(full);
  });
  return results;
}

walk('src').forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('setInterval')) {
    content.split('\n').forEach((line, idx) => {
      if (line.includes('setInterval')) {
        console.log(`${file}:${idx + 1} -> ${line.trim()}`);
      }
    });
  }
});

