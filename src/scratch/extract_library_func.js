const fs = require('fs');

async function extractLeaderboardComputation() {
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard').then(r => r.text());
  const jsFileMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  const jsCode = await fetch('https://msoelibrary.vercel.app' + jsFileMatch[1]).then(r => r.text());

  const idx = jsCode.indexOf('Top Readers');
  // Look back 15000 chars before 'Top Readers'
  const start = Math.max(0, idx - 15000);
  const chunk = jsCode.slice(start, idx);
  fs.writeFileSync('src/scratch/leaderboard_func.txt', chunk);
  console.log('Saved 15000 chars before Top Readers to src/scratch/leaderboard_func.txt');
}

extractLeaderboardComputation();
