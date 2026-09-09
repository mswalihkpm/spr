const fs = require('fs');

async function main() {
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard', { cache: 'no-store' }).then((r) => r.text());
  console.log('HTML Length:', html.length);
  const jsMatches = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map(m => m[1]);
  console.log('JS files:', jsMatches);

  for (const jsPath of jsMatches) {
    const code = await fetch(`https://msoelibrary.vercel.app${jsPath}`, { cache: 'no-store' }).then((r) => r.text());
    console.log(`\n=== JS File: ${jsPath} (Length: ${code.length}) ===`);

    // Let's find Leaderboard calculation code in the bundle
    const leaderboardIndices = [];
    let idx = 0;
    while ((idx = code.indexOf('leaderboard', idx)) !== -1) {
      leaderboardIndices.push(idx);
      idx += 11;
    }
    console.log(`Occurrences of 'leaderboard': ${leaderboardIndices.length}`);

    // Find snippets around calculation / borrow_records / scoring / points
    const keywords = ['borrow_records', 'scoring_table', 'leaderboard_from_date', 'review_points', 'full_read', 'half_read'];
    for (const kw of keywords) {
      let kIdx = 0;
      while ((kIdx = code.indexOf(kw, kIdx)) !== -1) {
        const snippet = code.substring(Math.max(0, kIdx - 200), Math.min(code.length, kIdx + 300));
        console.log(`\n--- Match for '${kw}' at ${kIdx} ---`);
        console.log(snippet);
        kIdx += kw.length + 50;
      }
    }
  }
}

main().catch(console.error);
