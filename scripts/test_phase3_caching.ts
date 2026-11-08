import { NextRequest } from 'next/server';
import { GET as getPublicStudent } from '../src/app/api/public/student/[id]/route';
import { getEndpointTTL, fetchWithDedupe, clearClientCache, getClientCacheStats } from '../src/lib/client-cache';
import { prisma } from '../src/lib/prisma';
import { invalidateEngineCache } from '../src/lib/spr-engine';

async function runTests() {
  console.log('================================================================');
  console.log('  SPR PHASE 3: API & CLIENT CACHING COMPREHENSIVE VERIFICATION  ');
  console.log('================================================================\n');

  // Clear all caches prior to testing
  invalidateEngineCache();
  clearClientCache();

  // Test 1: Verify Endpoint TTL and Security Classification in client-cache.ts
  console.log('TEST 1: Verifying client-cache.ts Security Boundaries & TTLs...');
  const securityChecks = [
    { url: '/api/public/student/MSOE-2026-001', expectedTTL: 120000, shouldCache: true, type: 'Public Scorecard' },
    { url: '/api/public/student/cm_abc_123', expectedTTL: 120000, shouldCache: true, type: 'Public Scorecard' },
    { url: '/api/student/auth/me', expectedTTL: 0, shouldCache: false, type: 'Private Student Auth' },
    { url: '/api/student/tasks', expectedTTL: 0, shouldCache: false, type: 'Private Student Tasks' },
    { url: '/api/student/transfers', expectedTTL: 0, shouldCache: false, type: 'Private Student Transfers' },
    { url: '/api/auth/me', expectedTTL: 0, shouldCache: false, type: 'Private User Auth' },
    { url: '/api/auth/login', expectedTTL: 0, shouldCache: false, type: 'Private User Login' },
    { url: '/api/students', expectedTTL: 0, shouldCache: false, type: 'Admin Student Management' },
    { url: '/api/scores', expectedTTL: 0, shouldCache: false, type: 'Admin Scores' },
    { url: '/api/admin/deletion-requests', expectedTTL: 0, shouldCache: false, type: 'Admin Deletion' },
    { url: '/api/audit-logs', expectedTTL: 0, shouldCache: false, type: 'Audit Logs' },
    { url: '/api/leaderboard', expectedTTL: 300000, shouldCache: true, type: 'Public Leaderboard' },
    { url: '/api/categories', expectedTTL: 86400000, shouldCache: true, type: 'Public Categories' },
  ];

  let securityFailures = 0;
  for (const check of securityChecks) {
    const ttl = getEndpointTTL(check.url);
    const passes = ttl === check.expectedTTL;
    if (!passes) {
      securityFailures++;
      console.error(`  [FAIL] ${check.type} (${check.url}): Expected TTL ${check.expectedTTL}, got ${ttl}`);
    } else {
      console.log(`  [PASS] ${check.type} (${check.url}) -> TTL: ${ttl}ms (Cacheable: ${ttl > 0})`);
    }
  }

  if (securityFailures > 0) {
    throw new Error(`Security TTL tests failed with ${securityFailures} failures!`);
  }
  console.log('=> Security boundaries verified: Zero private/auth endpoints cacheable!\n');

  // Test 2: Server-Side Cache Hit vs Miss vs Bypass
  console.log('TEST 2: Server-Side Cache Hit / Miss / Freshness Header Verification...');
  const students = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    take: 2,
    select: { id: true, studentId: true, fullName: true },
  });

  if (students.length < 2) {
    throw new Error('Need at least 2 active students in database for testing.');
  }

  const s1 = students[0];
  const s2 = students[1];

  console.log(`Student 1: ${s1.studentId} (${s1.fullName}) [id: ${s1.id}]`);
  console.log(`Student 2: ${s2.studentId} (${s2.fullName}) [id: ${s2.id}]`);

  // Request 1: Cold / MISS for Student 1
  const req1 = new NextRequest(`http://localhost:3000/api/public/student/${s1.studentId}`);
  const t0 = Date.now();
  const res1 = await getPublicStudent(req1, { params: { id: s1.studentId } });
  const latency1 = Date.now() - t0;
  const data1 = await res1.json();
  const cacheHeader1 = res1.headers.get('X-SPR-Cache');
  const ccHeader1 = res1.headers.get('Cache-Control');

  console.log(`  Request 1 (Student 1 Initial): ${res1.status} | Cache: ${cacheHeader1} | Time: ${latency1}ms`);
  console.log(`    Cache-Control: ${ccHeader1}`);
  if (cacheHeader1 !== 'MISS' || ccHeader1 !== 'public, s-maxage=120, max-age=60') {
    throw new Error(`Request 1 failed cache expectation: got cache=${cacheHeader1}, cc=${ccHeader1}`);
  }
  // Verify notes field sanitization
  if ('notes' in data1.profile.student) {
    throw new Error(`Security violation: 'notes' field found in student object!`);
  }

  // Request 2: Warm / HIT for Student 1
  const req2 = new NextRequest(`http://localhost:3000/api/public/student/${s1.studentId}`);
  const t1 = Date.now();
  const res2 = await getPublicStudent(req2, { params: { id: s1.studentId } });
  const latency2 = Date.now() - t1;
  const data2 = await res2.json();
  const cacheHeader2 = res2.headers.get('X-SPR-Cache');
  const ccHeader2 = res2.headers.get('Cache-Control');

  console.log(`  Request 2 (Student 1 Repeat): ${res2.status} | Cache: ${cacheHeader2} | Time: ${latency2}ms`);
  console.log(`    Cache-Control: ${ccHeader2}`);
  if (cacheHeader2 !== 'HIT' || ccHeader2 !== 'public, s-maxage=120, max-age=60') {
    throw new Error(`Request 2 failed cache expectation: expected HIT, got ${cacheHeader2}, cc=${ccHeader2}`);
  }
  if ('notes' in data2.profile.student) {
    throw new Error(`Security violation: 'notes' field found in cached student object!`);
  }

  // Request 3: Freshness bypass (?fresh=true)
  const req3 = new NextRequest(`http://localhost:3000/api/public/student/${s1.studentId}?fresh=true`);
  const res3 = await getPublicStudent(req3, { params: { id: s1.studentId } });
  const cacheHeader3 = res3.headers.get('X-SPR-Cache');
  const ccHeader3 = res3.headers.get('Cache-Control');

  console.log(`  Request 3 (Student 1 ?fresh=true): ${res3.status} | Cache: ${cacheHeader3}`);
  console.log(`    Cache-Control: ${ccHeader3}`);
  if (cacheHeader3 !== 'BYPASS' || !ccHeader3?.includes('no-store')) {
    throw new Error(`Request 3 failed freshness bypass expectation`);
  }
  console.log('=> Cache-Control & Cache Hit/Miss headers verified!\n');

  // Test 3: Anti-Collision / Cross-Student Cache Isolation
  console.log('TEST 3: Anti-Collision & Student Cache Isolation...');
  // Request Student 2
  const reqS2 = new NextRequest(`http://localhost:3000/api/public/student/${s2.studentId}`);
  const resS2 = await getPublicStudent(reqS2, { params: { id: s2.studentId } });
  const dataS2 = await resS2.json();

  // Re-request Student 1 from cache
  const reqS1Again = new NextRequest(`http://localhost:3000/api/public/student/${s1.studentId}`);
  const resS1Again = await getPublicStudent(reqS1Again, { params: { id: s1.studentId } });
  const dataS1Again = await resS1Again.json();

  if (dataS2.profile.student.studentId !== s2.studentId) {
    throw new Error(`Student 2 data mismatch! Expected ${s2.studentId}, got ${dataS2.profile.student.studentId}`);
  }
  if (dataS1Again.profile.student.studentId !== s1.studentId) {
    throw new Error(`Cross-contamination detected! Student 1 returned ${dataS1Again.profile.student.studentId}`);
  }
  if (dataS1Again.profile.student.id === dataS2.profile.student.id) {
    throw new Error(`Different students shared the same database ID in cache!`);
  }
  if ('notes' in dataS2.profile.student || 'notes' in dataS1Again.profile.student) {
    throw new Error(`Security violation: 'notes' field present in student profile!`);
  }
  console.log(`  [PASS] Student 1: ${dataS1Again.profile.student.fullName} (Rank: ${dataS1Again.profile.rank}, SPR: ${dataS1Again.profile.overallSPR})`);
  console.log(`  [PASS] Student 2: ${dataS2.profile.student.fullName} (Rank: ${dataS2.profile.rank}, SPR: ${dataS2.profile.overallSPR})`);
  console.log('=> Anti-Collision verified: Different students are 100% isolated by primary key!\n');

  // Test 4: Invalidation upon mutation
  console.log('TEST 4: Invalidation upon scoring changes...');
  invalidateEngineCache(); // Simulates score mutation trigger
  const reqAfterInvalidate = new NextRequest(`http://localhost:3000/api/public/student/${s1.studentId}`);
  const resAfterInvalidate = await getPublicStudent(reqAfterInvalidate, { params: { id: s1.studentId } });
  const cacheHeaderAfter = resAfterInvalidate.headers.get('X-SPR-Cache');

  console.log(`  Request after invalidateEngineCache(): Cache = ${cacheHeaderAfter}`);
  if (cacheHeaderAfter !== 'MISS') {
    throw new Error(`Cache failed to clear on invalidateEngineCache()! Expected MISS, got ${cacheHeaderAfter}`);
  }
  console.log('=> Invalidation verified: Cache clears instantly upon scoring mutations!\n');

  // Test 5: Non-existent student returns 404 with no-cache
  console.log('TEST 5: Non-Existent Student Error Handling...');
  const req404 = new NextRequest('http://localhost:3000/api/public/student/NON_EXISTENT_ID_9999');
  const res404 = await getPublicStudent(req404, { params: { id: 'NON_EXISTENT_ID_9999' } });
  const cc404 = res404.headers.get('Cache-Control');
  console.log(`  404 Request: Status = ${res404.status} | Cache-Control: ${cc404}`);
  if (res404.status !== 404 || !cc404?.includes('no-store')) {
    throw new Error('404 response must not be cached');
  }
  console.log('=> Error handling verified: 404s are never cached!\n');

  // Summary Metrics
  console.log('================================================================');
  console.log('  PHASE 3 VERIFICATION COMPLETE: ALL 5 SUITES PASSED (100%)     ');
  console.log(`  Cold Latency: ${latency1} ms -> Warm Cache Latency: ${latency2} ms (-${(((latency1 - latency2) / latency1) * 100).toFixed(1)}%)`);
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('\nTests failed with error:', err);
  process.exit(1);
}).then(() => process.exit(0));
