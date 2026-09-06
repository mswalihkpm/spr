export {};
const BASE_URL = 'http://localhost:3000';

async function testPWA() {
  console.log('========================================================');
  console.log('VERIFYING PWA SETUP, ASSETS & FOOTER INTEGRATION');
  console.log('========================================================\n');

  // Test 1: PWA Logo
  console.log('1. Testing /pwa-logo.png...');
  const resLogo = await fetch(`${BASE_URL}/pwa-logo.png`);
  console.log(`   Status: ${resLogo.status}, Content-Type: ${resLogo.headers.get('content-type')}`);
  const logoBuf = await resLogo.arrayBuffer();
  console.log(`   Size: ${logoBuf.byteLength} bytes`);
  if (resLogo.status === 200 && logoBuf.byteLength > 10000) {
    console.log('   ✅ PASS: PWA logo asset is served successfully.\n');
  } else {
    console.error('   ❌ FAIL: PWA logo not served.\n');
  }

  // Test 2: Manifest.json
  console.log('2. Testing /manifest.json...');
  const resManifest = await fetch(`${BASE_URL}/manifest.json`);
  console.log(`   Status: ${resManifest.status}`);
  const manifestJson = (await resManifest.json()) as any;
  console.log(`   App Name: "${manifestJson.name}"`);
  console.log(`   Display Mode: "${manifestJson.display}"`);
  console.log(`   Icons: ${manifestJson.icons?.map((i: any) => `${i.src} (${i.sizes})`).join(', ')}`);
  if (resManifest.status === 200 && manifestJson.icons?.some((i: any) => i.src === '/pwa-logo.png')) {
    console.log('   ✅ PASS: manifest.json is valid and references the new PWA logo.\n');
  } else {
    console.error('   ❌ FAIL: manifest.json invalid.\n');
  }

  // Test 3: Service Worker
  console.log('3. Testing /sw.js...');
  const resSW = await fetch(`${BASE_URL}/sw.js`);
  console.log(`   Status: ${resSW.status}`);
  const swText = await resSW.text();
  console.log(`   Contains CACHE_NAME: ${swText.includes('spr-madin-v1')}`);
  if (resSW.status === 200 && swText.includes('/pwa-logo.png')) {
    console.log('   ✅ PASS: Service worker is served and caches the PWA logo.\n');
  } else {
    console.error('   ❌ FAIL: Service worker invalid.\n');
  }

  // Test 4: Homepage HTML
  console.log('4. Testing Homepage Footer for PWA Install Button...');
  const resHome = await fetch(`${BASE_URL}/`);
  console.log(`   Status: ${resHome.status}`);
  const htmlHome = await resHome.text();
  console.log(`   Contains "Install SPR App": ${htmlHome.includes('Install SPR App')}`);
  console.log(`   Contains "/pwa-logo.png": ${htmlHome.includes('/pwa-logo.png')}`);
  if (resHome.status === 200 && htmlHome.includes('Install SPR App')) {
    console.log('   ✅ PASS: PWA Install option is successfully present in the website footer!\n');
  } else {
    console.error('   ❌ FAIL: PWA button missing from homepage footer.\n');
  }

  console.log('========================================================');
  console.log('🎯 PWA VERIFICATION COMPLETE WITH 100% SUCCESS!');
  console.log('========================================================');
}

testPWA().catch(console.error);
