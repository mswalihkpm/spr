const fs = require('fs');

async function analyzeLeaderboardLogic() {
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard').then(r => r.text());
  const jsFileMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  const jsCode = await fetch('https://msoelibrary.vercel.app' + jsFileMatch[1]).then(r => r.text());

  // Search for Leaderboard component or references
  const idx = jsCode.indexOf('Top Readers');
  console.log('Index of "Top Readers":', idx);
  if (idx !== -1) {
    const snippet = jsCode.slice(Math.max(0, idx - 1500), Math.min(jsCode.length, idx + 3500));
    fs.writeFileSync('src/scratch/leaderboard_snippet.txt', snippet);
    console.log('Saved snippet around "Top Readers" to src/scratch/leaderboard_snippet.txt');
  }

  // Also search for "leaderboard_snapshots" or how points are calculated
  const idx2 = jsCode.indexOf('leaderboard_snapshots');
  console.log('Index of "leaderboard_snapshots":', idx2);
  if (idx2 !== -1) {
    const snippet2 = jsCode.slice(Math.max(0, idx2 - 1000), Math.min(jsCode.length, idx2 + 2000));
    fs.writeFileSync('src/scratch/snapshot_snippet.txt', snippet2);
  }
}

analyzeLeaderboardLogic();
