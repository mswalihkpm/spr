const fs = require('fs');

async function findScoringLogic() {
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard').then(r => r.text());
  const jsFileMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  const jsCode = await fetch('https://msoelibrary.vercel.app' + jsFileMatch[1]).then(r => r.text());

  // Search for "fullRead" or "halfRead" in the JS code
  let pos = 0;
  while ((pos = jsCode.indexOf('fullRead', pos)) !== -1) {
    console.log('Found fullRead at pos:', pos);
    console.log(jsCode.slice(Math.max(0, pos - 500), Math.min(jsCode.length, pos + 1000)));
    console.log('---------------------------------------------------------');
    pos += 8;
  }
}

findScoringLogic();
