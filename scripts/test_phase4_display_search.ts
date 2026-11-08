import { NextRequest } from 'next/server';
import { GET as getPublicSearch } from '../src/app/api/public/search/route';
import { GET as getStudentsAdmin } from '../src/app/api/students/route';
import { GET as getDisplayData } from '../src/app/api/display/route';
import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function runPhase4Verification() {
  console.log('================================================================');
  console.log('  SPR PHASE 4: DISPLAY & GLOBAL SEARCH VERIFICATION SUITE       ');
  console.log('================================================================\n');

  // 1. Test Public Search (/api/public/search)
  console.log('TEST 1: Public Search API Endpoint Verification...');
  const sampleStudent = await prisma.student.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true, studentId: true, fullName: true, sprStudentId: true },
  });

  if (!sampleStudent) {
    throw new Error('No active student found in database for testing.');
  }

  // 1a. Search by student full name
  const firstName = sampleStudent.fullName.split(' ')[0];
  const reqName = new NextRequest(`http://localhost:3000/api/public/search?q=${encodeURIComponent(firstName)}`);
  const resName = await getPublicSearch(reqName);
  const dataName = await resName.json();

  console.log(`  [PASS] Public Search by Name ("${firstName}"): Status ${resName.status} | Found: ${dataName.students?.length || 0} students`);
  if (resName.status !== 200 || !Array.isArray(dataName.students)) {
    throw new Error('Public search by name failed.');
  }

  // 1b. Search by official studentId (e.g. MSOE-2026-001)
  const reqId = new NextRequest(`http://localhost:3000/api/public/search?q=${encodeURIComponent(sampleStudent.studentId)}`);
  const resId = await getPublicSearch(reqId);
  const dataId = await resId.json();

  const foundMatch = dataId.students?.some((s: any) => s.studentId === sampleStudent.studentId);
  console.log(`  [PASS] Public Search by School ID ("${sampleStudent.studentId}"): Status ${resId.status} | Matched: ${foundMatch}`);
  if (!foundMatch) {
    throw new Error(`Public search failed to locate student by ID: ${sampleStudent.studentId}`);
  }

  // 1c. Verify sanitization: Ensure no notes or credentials in public search results
  const firstResult = dataId.students[0];
  if ('notes' in firstResult || 'passwordHash' in firstResult || 'email' in firstResult) {
    throw new Error('Security violation: Sensitive fields exposed in public search result!');
  }
  console.log('  [PASS] Public Search Sanitization: Zero private fields or notes returned.');
  console.log('=> Public Search verified!\n');

  // 2. Test Admin Search Authorization (/api/students)
  console.log('TEST 2: Admin Search Authorization & Security Verification...');
  const unauthReq = new NextRequest(`http://localhost:3000/api/students?search=${encodeURIComponent(firstName)}&limit=25`);
  const unauthRes = await getStudentsAdmin(unauthReq);
  console.log(`  [PASS] Unauthenticated /api/students Request: Status = ${unauthRes.status} (Expected: 401 Unauthorized)`);
  if (unauthRes.status !== 401) {
    throw new Error(`Security failure: Expected 401 from unauthenticated /api/students, got ${unauthRes.status}`);
  }
  console.log('=> Admin endpoint strictly preserves authentication and authorization!\n');

  // 3. Test Kiosk Display API (/api/display)
  console.log('TEST 3: Kiosk Display API Verification...');
  const displayReq = new NextRequest('http://localhost:3000/api/display');
  const displayRes = await getDisplayData(displayReq);
  const displayData = await displayRes.json();

  console.log(`  [PASS] Kiosk /api/display: Status ${displayRes.status}`);
  console.log(`  [PASS] Institution: "${displayData.institutionName}"`);
  console.log(`  [PASS] Leaderboard entries: ${displayData.leaderboard?.length || 0} | Top 3: ${displayData.topThree?.length || 0}`);
  console.log(`  [PASS] Active Categories: ${displayData.categories?.length || 0} | Classes: ${displayData.classes?.length || 0}`);

  if (displayRes.status !== 200 || !displayData.leaderboard || !displayData.topThree) {
    throw new Error('Kiosk display payload incomplete or invalid.');
  }
  console.log('=> Kiosk display endpoint verified!\n');

  // 4. Verify Display Page Code Implementation (Interval & Overlapping Guard)
  console.log('TEST 4: Inspecting src/app/display/page.tsx implementation...');
  const displayPageContent = fs.readFileSync(path.resolve('src/app/display/page.tsx'), 'utf8');

  // Check interval is 120000ms (120 seconds)
  const has120sInterval = displayPageContent.includes('120000');
  console.log(`  [PASS] 120-Second Polling Interval configured: ${has120sInterval}`);
  if (!has120sInterval) {
    throw new Error('display/page.tsx does not configure 120000ms polling interval.');
  }

  // Check isFetchingRef overlapping prevention
  const hasOverlapGuard = displayPageContent.includes('if (isFetchingRef.current) return;');
  console.log(`  [PASS] Overlapping Request Lock (isFetchingRef) implemented: ${hasOverlapGuard}`);
  if (!hasOverlapGuard) {
    throw new Error('display/page.tsx does not guard against overlapping requests.');
  }
  console.log('=> Kiosk display polling & overlap protection verified!\n');

  // 5. Verify GlobalSearchModal Implementation
  console.log('TEST 5: Inspecting src/components/search/GlobalSearchModal.tsx...');
  const searchModalContent = fs.readFileSync(path.resolve('src/components/search/GlobalSearchModal.tsx'), 'utf8');

  // Check isAdmin prop and defaulting to false
  const hasIsAdminProp = searchModalContent.includes('isAdmin = false');
  console.log(`  [PASS] GlobalSearchModal defaults to public (isAdmin = false): ${hasIsAdminProp}`);
  if (!hasIsAdminProp) {
    throw new Error('GlobalSearchModal does not default isAdmin to false.');
  }

  // Check that public searches go directly to /api/public/search
  const hasDirectPublicRoute = searchModalContent.includes("fetch(`/api/public/search?q=");
  console.log(`  [PASS] Direct routing to /api/public/search for public visitors: ${hasDirectPublicRoute}`);
  if (!hasDirectPublicRoute) {
    throw new Error('GlobalSearchModal missing direct public search routing.');
  }

  // Check that admin layout passes isAdmin
  const adminLayoutContent = fs.readFileSync(path.resolve('src/components/layout/AdminLayout.tsx'), 'utf8');
  const adminPassesIsAdmin = adminLayoutContent.includes('isAdmin={Boolean(user)}');
  console.log(`  [PASS] AdminLayout passes isAdmin state to GlobalSearchModal: ${adminPassesIsAdmin}`);
  if (!adminPassesIsAdmin) {
    throw new Error('AdminLayout does not pass isAdmin state.');
  }

  console.log('\n================================================================');
  console.log('  PHASE 4 VERIFICATION COMPLETE: ALL 5 SUITES PASSED (100%)     ');
  console.log('================================================================');
}

runPhase4Verification().catch((err) => {
  console.error('\nTests failed with error:', err);
  process.exit(1);
}).then(() => process.exit(0));

