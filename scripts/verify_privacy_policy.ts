import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log('SPR PRIVACY POLICY VERIFICATION SUITE');
console.log('========================================================================\n');

let allPassed = true;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    if (details) console.log(`       ${details}`);
  } else {
    console.error(`[FAIL] ${testName}`);
    if (details) console.error(`       ${details}`);
    allPassed = false;
  }
}

// 1. Verify /privacy-policy page file exists
const privacyPagePath = path.join(process.cwd(), 'src', 'app', 'privacy-policy', 'page.tsx');
assert(fs.existsSync(privacyPagePath), 'Privacy Policy page file exists', privacyPagePath);

if (fs.existsSync(privacyPagePath)) {
  const content = fs.readFileSync(privacyPagePath, 'utf8');

  // Verify Required Google Play & Legal Information
  assert(content.includes('in.madin.spr'), 'Contains Android package name in.madin.spr');
  assert(content.includes('excellence@madin.edu.in'), 'Contains official contact email excellence@madin.edu.in');
  assert(content.includes('https://msoerate.vercel.app'), 'Contains official canonical website URL');
  assert(content.includes('Madin School of Excellence'), 'Identifies legal institution Madin School of Excellence');
  assert(content.includes("Ma'din Academy") || content.includes("Ma&apos;din Academy"), "Identifies parent organization Ma'din Academy");
  assert(content.includes('Digital Personal Data Protection') || content.includes('DPDP'), 'References DPDP Act 2023 compliance');
  assert(content.includes('Account Deletion') || content.includes('Google Play Account Deletion'), 'Includes prominent Account Deletion section');
  assert(content.includes('spr_auth_token') && content.includes('spr_student_token'), 'Discloses authentication session cookies');
  assert(content.includes('Supabase') && content.includes('ap-south-1'), 'Discloses Supabase database endpoint in AWS ap-south-1');
  assert(content.includes('Vercel'), 'Discloses Vercel Edge hosting');
  assert(content.includes('canonical: \'https://msoerate.vercel.app/privacy-policy\''), 'Exports canonical metadata');
}

// 2. Verify Navigation & Link Integrations
const filesWithLinks = [
  { file: 'src/components/layout/PublicFooter.tsx', label: 'PublicFooter component' },
  { file: 'src/app/student/login/page.tsx', label: 'Student Login / Activation Page' },
  { file: 'src/app/student/dashboard/page.tsx', label: 'Student Dashboard Portal' },
  { file: 'src/app/login/page.tsx', label: 'Staff Login Page' },
  { file: 'src/app/settings/page.tsx', label: 'Admin Settings Page' },
  { file: 'src/components/layout/AdminLayout.tsx', label: 'Admin Sidebar Layout' },
];

console.log('\n--- Checking Link Integrations across Application ---');
for (const item of filesWithLinks) {
  const fullPath = path.join(process.cwd(), item.file);
  const exists = fs.existsSync(fullPath);
  assert(exists, `${item.label} file exists`, item.file);
  if (exists) {
    const text = fs.readFileSync(fullPath, 'utf8');
    assert(text.includes('/privacy-policy'), `${item.label} contains active link to /privacy-policy`);
  }
}

// 3. Verify Android Digital Asset Links
console.log('\n--- Checking Android TWA / WebView Assetlinks ---');
const assetlinksPath = path.join(process.cwd(), 'public', '.well-known', 'assetlinks.json');
assert(fs.existsSync(assetlinksPath), 'assetlinks.json exists in public/.well-known');
if (fs.existsSync(assetlinksPath)) {
  const jsonText = fs.readFileSync(assetlinksPath, 'utf8');
  assert(jsonText.includes('in.madin.spr'), 'assetlinks.json associates domain with in.madin.spr');
}

// 4. Verify Static Prerender in .next output
console.log('\n--- Checking Production Build Artifacts ---');
const prerenderManifestPath = path.join(process.cwd(), '.next', 'prerender-manifest.json');
if (fs.existsSync(prerenderManifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(prerenderManifestPath, 'utf8'));
  const isPrerendered = Boolean(manifest.routes && manifest.routes['/privacy-policy']);
  assert(isPrerendered, '/privacy-policy is prerendered in Next.js static build routes');
}

console.log('\n========================================================================');
if (allPassed) {
  console.log('ALL PRIVACY POLICY VERIFICATIONS PASSED SUCCESSFULLY (0 ERRORS)');
} else {
  console.error('ONE OR MORE VERIFICATIONS FAILED');
  process.exit(1);
}
console.log('========================================================================');

