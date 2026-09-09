const fs = require('fs');

async function printScoringFunction() {
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard').then(r => r.text());
  const jsFileMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  const jsCode = await fetch('https://msoelibrary.vercel.app' + jsFileMatch[1]).then(r => r.text());

  const snippet = jsCode.slice(2655000, 2658000);
  console.log(snippet);
}

printScoringFunction();
