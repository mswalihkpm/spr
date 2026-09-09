const fs = require('fs');

async function main() {
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard', { cache: 'no-store' }).then((r) => r.text());
  const jsMatches = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map(m => m[1]);
  for (const jsPath of jsMatches) {
    const code = await fetch(`https://msoelibrary.vercel.app${jsPath}`, { cache: 'no-store' }).then((r) => r.text());
    
    // Search for "Imthiyaaz Library" or "All classes" or "All time"
    const terms = ['All classes', 'All time', 'Top Readers', 'vK('];
    for (const t of terms) {
      let idx = 0;
      while ((idx = code.indexOf(t, idx)) !== -1) {
        console.log(`Found term '${t}' at ${idx}:`);
        console.log(code.substring(Math.max(0, idx - 400), Math.min(code.length, idx + 800)));
        console.log('-------------------------------------------');
        idx += t.length + 100;
      }
    }
  }
}

main().catch(console.error);
