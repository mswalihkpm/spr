const fs = require('fs');

async function findIg() {
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard').then(r => r.text());
  const jsFileMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  const jsCode = await fetch('https://msoelibrary.vercel.app' + jsFileMatch[1]).then(r => r.text());

  // Search for "ig=" or "ig = async"
  const matches = [...jsCode.matchAll(/(const\s+ig\s*=|ig\s*=\s*async)/g)];
  for (const m of matches) {
    console.log('Match at', m.index, jsCode.slice(m.index, m.index + 500));
  }

  // Also search for borrow_records query in JS code
  const borrowMatches = [...jsCode.matchAll(/from\(["']borrow_records["']\)[^;]+/g)];
  for (const bm of borrowMatches) {
    console.log('Borrow query at', bm.index, bm[0].slice(0, 300));
  }
}

findIg();
