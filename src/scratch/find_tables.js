const fs = require('fs');

const js = fs.readFileSync('src/scratch/lib_bundle.js', 'utf8');

// Find all occurrences of Qe.from("...")
const tableMatches = new Set();
const regex = /Qe\.from\("([^"]+)"\)/g;
let m;
while ((m = regex.exec(js)) !== null) {
  tableMatches.add(m[1]);
}

console.log('All Supabase tables accessed in frontend:');
console.log(Array.from(tableMatches));
