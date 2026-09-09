const fs = require('fs');

const js = fs.readFileSync('src/scratch/lib_bundle.js', 'utf8');

// Let's print vK completely
console.log('--- vK ---');
console.log(js.slice(2655994, 2656800));

// Let's find where borrow_records query is mapped into borrowerName / readStatus
const queryIdx = js.indexOf('"borrow_records"');
console.log('Found "borrow_records" at:', queryIdx);
console.log(js.slice(queryIdx - 100, queryIdx + 800));

