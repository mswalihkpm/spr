const { syncLibraryLeaderboardToSPR } = require('../lib/library-sync');

async function main() {
  const res = await syncLibraryLeaderboardToSPR();
  console.log('Sync result:', res);
}

main().catch(console.error);
