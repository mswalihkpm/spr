const fs = require('fs');

async function main() {
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard', { cache: 'no-store' }).then((r) => r.text());
  const jsMatches = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map(m => m[1]);
  for (const jsPath of jsMatches) {
    const code = await fetch(`https://msoelibrary.vercel.app${jsPath}`, { cache: 'no-store' }).then((r) => r.text());
    const idx = code.indexOf('Top Readers');
    if (idx !== -1) {
      console.log('Public Leaderboard component:');
      console.log(code.substring(idx - 3000, idx + 1000));
    }
  }
}

main().catch(console.error);
