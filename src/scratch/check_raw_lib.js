const { fetchLibraryLeaderboard } = require('../lib/library-sync');

async function main() {
  const data = await fetchLibraryLeaderboard();
  console.log('Leaderboard entries:');
  data.leaderboard.forEach((r, idx) => {
    console.log(`#${idx + 1}: Name="${r.name}", Class="${r.className}", Points=${r.points}, Books=${r.totalBooks}`);
  });
}

main().catch(console.error);
