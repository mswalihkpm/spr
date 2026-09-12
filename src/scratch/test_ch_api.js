async function main() {
  const res = await fetch('http://localhost:3000/api/leaderboard?categoryId=cmtop8qwp000q4d8s7y6nuvli');
  if (!res.ok) {
    console.log('Dev server might not be running on 3000 or status is', res.status);
    return;
  }
  const data = await res.json();
  console.log('API Creative Hub Leaderboard Count:', data.leaderboard?.length);
  if (data.leaderboard) {
    data.leaderboard.forEach((s) => {
      console.log(`Rank #${s.rank}: ${s.name} - ${s.spr} pts (${s.recordsCount} works)`);
    });
  }
}
main().catch(console.error);
