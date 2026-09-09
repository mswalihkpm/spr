const fs = require('fs');

async function findQ6() {
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard').then(r => r.text());
  const jsFileMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  const jsCode = await fetch('https://msoelibrary.vercel.app' + jsFileMatch[1]).then(r => r.text());

  const idx = jsCode.indexOf('function Q6');
  console.log('function Q6 idx:', idx);
  if (idx !== -1) {
    console.log(jsCode.slice(idx, idx + 1000));
  } else {
    // search for Q6=
    const idx2 = jsCode.indexOf('Q6=');
    console.log('Q6= idx:', idx2);
    if (idx2 !== -1) {
      console.log(jsCode.slice(idx2, idx2 + 1000));
    }
  }
}

findQ6();
