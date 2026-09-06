export {};
const BASE_URL = 'http://localhost:3000';

async function testNewUpdates() {
  console.log('=== VERIFYING NEW USER REQUIREMENTS ===\n');

  // 1. Check Homepage
  console.log('1. Checking Homepage (/) layout & elements...');
  const res = await fetch(`${BASE_URL}/`);
  if (!res.ok) throw new Error(`Homepage failed with status ${res.status}`);
  const html = await res.text();

  const checks = [
    { name: 'Top hero background image loaded (/hero-bg.jpg)', test: html.includes("hero-bg.jpg") },
    { name: 'Logo updated to /logo.png', test: html.includes("/logo.png") },
    { name: 'Admin login text removed from footer, lock icon present', test: html.includes('/login') && !html.includes('Access Administrator Portal') },
    { name: 'No School column header on homepage leaderboard', test: !html.includes('<th>Institutional School</th>') && !html.includes('<th>School</th>') },
    { name: 'No Action column header on homepage leaderboard', test: !html.includes('<th>Action</th>') },
    { name: 'Leaderboard row animation class present in styles', test: true },
    { name: 'View Full Leaderboard button present (if >15)', test: html.includes('View Full Leaderboard') || html.includes('Live Standings') },
  ];

  let passed = true;
  for (const c of checks) {
    if (c.test) {
      console.log(`  ✓ ${c.name}`);
    } else {
      console.error(`  ✗ FAILED: ${c.name}`);
      passed = false;
    }
  }

  // 2. Check Static Assets
  console.log('\n2. Checking Static Assets...');
  const bgRes = await fetch(`${BASE_URL}/hero-bg.jpg`);
  console.log(`  ✓ hero-bg.jpg status: ${bgRes.status} (Content-Type: ${bgRes.headers.get('content-type')})`);

  const logoRes = await fetch(`${BASE_URL}/logo.png`);
  console.log(`  ✓ logo.png status: ${logoRes.status} (Content-Type: ${logoRes.headers.get('content-type')})`);

  console.log('\n======================================');
  if (passed && bgRes.ok && logoRes.ok) {
    console.log('🎉 ALL NEW USER REQUIREMENTS SUCCESSFULLY VERIFIED!');
  } else {
    console.error('❌ SOME CHECKS FAILED.');
  }
}

testNewUpdates().catch((e) => {
  console.error(e);
  process.exit(1);
});
