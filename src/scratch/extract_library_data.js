const fs = require('fs');

async function extractDefinitions() {
  const html = await fetch('https://msoelibrary.vercel.app/leaderboard').then(r => r.text());
  const jsFileMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
  const jsCode = await fetch('https://msoelibrary.vercel.app' + jsFileMatch[1]).then(r => r.text());

  // Let's find vK definition: vK=
  const matchvK = jsCode.match(/const vK=([^;]+);/);
  console.log('matchvK:', matchvK ? matchvK[0].slice(0, 300) : 'not found');

  // Let's search for "function vK" or "vK=(" or "vK="
  const idxVK = jsCode.indexOf('vK=');
  console.log('idxVK:', idxVK);
  if (idxVK !== -1) {
    console.log('vK snippet:', jsCode.slice(idxVK, idxVK + 1500));
  }

  // Let's search for how borrow_records and books and students are queried in ig, nx, Qs, _h, VF
  const queries = ['ig=', 'nx=', 'Qs=', '_h=', 'VF='];
  for (const q of queries) {
    const idx = jsCode.indexOf(q);
    if (idx !== -1) {
      console.log(`${q} snippet:`, jsCode.slice(idx, idx + 400));
    }
  }
}

extractDefinitions();
