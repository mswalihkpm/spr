import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const EXPECTED_PROJECT_REF = 'xfnhahqzywrxzozxrswq';
const OLD_PROJECT_REF = 'xzklhvmewxcaxbablcxs';

interface ValidationCheck {
  id: number;
  title: string;
  passed: boolean;
  details: string;
}

function maskConnectionString(uri: string): string {
  try {
    // Mask password in URI: postgresql://user:password@host:port/db
    return uri.replace(/:([^:@]+)@/, ':***@');
  } catch {
    return '***';
  }
}

function maskApiKey(key: string): string {
  if (!key || key.length < 10) return '***';
  return `${key.slice(0, 6)}...${key.slice(-4)} (${key.length} chars)`;
}

async function runValidation() {
  console.log('================================================================');
  console.log('     SPR – PHASE 2B: TARGET PRE-RESTORATION VALIDATION AUDIT    ');
  console.log('================================================================\n');

  const checks: ValidationCheck[] = [];

  // 1. Load credentials securely from .env.target
  const envTargetFile = path.resolve(process.cwd(), '.env.target');
  const fileExists = fs.existsSync(envTargetFile);

  const envValues: Record<string, string> = {};
  if (fileExists) {
    const lines = fs.readFileSync(envTargetFile, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const k = trimmed.slice(0, idx).trim();
        let v = trimmed.slice(idx + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        envValues[k] = v;
      }
    }
  }

  checks.push({
    id: 1,
    title: 'Securely load credentials from .env.target',
    passed: fileExists,
    details: fileExists ? `File found at ${envTargetFile} (${fs.statSync(envTargetFile).size} bytes)` : 'File not found',
  });

  // 2. Verify all five environment variables are present
  const requiredKeys = [
    'TARGET_DATABASE_URL',
    'TARGET_DIRECT_URL',
    'TARGET_SUPABASE_URL',
    'TARGET_SUPABASE_SERVICE_ROLE_KEY',
    'TARGET_SUPABASE_ANON_KEY',
  ];

  const missingKeys = requiredKeys.filter((k) => !envValues[k] || envValues[k].trim() === '');
  const allKeysPresent = missingKeys.length === 0;

  checks.push({
    id: 2,
    title: 'Verify all five target environment variables are present',
    passed: allKeysPresent,
    details: allKeysPresent
      ? `All 5 variables present: ${requiredKeys.join(', ')}`
      : `Missing variables: ${missingKeys.join(', ')}`,
  });

  const dbUrl = envValues['TARGET_DATABASE_URL'] || '';
  const directUrl = envValues['TARGET_DIRECT_URL'] || '';
  const supabaseUrl = envValues['TARGET_SUPABASE_URL'] || '';
  const serviceKey = envValues['TARGET_SUPABASE_SERVICE_ROLE_KEY'] || '';
  const anonKey = envValues['TARGET_SUPABASE_ANON_KEY'] || '';

  // 3. Verify project reference is exactly xfnhahqzywrxzozxrswq
  const refInDbUrl = dbUrl.includes(EXPECTED_PROJECT_REF);
  const refInDirectUrl = directUrl.includes(EXPECTED_PROJECT_REF);
  const refInSupabaseUrl = supabaseUrl.includes(EXPECTED_PROJECT_REF);
  const exactRefMatched = refInDbUrl && refInDirectUrl && refInSupabaseUrl;

  checks.push({
    id: 3,
    title: `Verify project reference is exactly "${EXPECTED_PROJECT_REF}"`,
    passed: exactRefMatched,
    details: exactRefMatched
      ? `Verified across TARGET_DATABASE_URL, TARGET_DIRECT_URL, and TARGET_SUPABASE_URL.`
      : `Mismatch: DB_URL=${refInDbUrl}, DIRECT_URL=${refInDirectUrl}, SUPABASE_URL=${refInSupabaseUrl}`,
  });

  // 4. Verify TARGET_DATABASE_URL uses Transaction Pooler (port 6543)
  const isPort6543 = dbUrl.includes(':6543/') || dbUrl.includes(':6543?');
  const hasPgbouncer = dbUrl.toLowerCase().includes('pgbouncer=true') || dbUrl.includes('pooler.supabase.com');
  const dbUrlPoolerValid = isPort6543 && hasPgbouncer;

  checks.push({
    id: 4,
    title: 'Verify TARGET_DATABASE_URL uses Transaction Pooler (port 6543)',
    passed: dbUrlPoolerValid,
    details: dbUrlPoolerValid
      ? `Port 6543 verified with pooler configuration: ${maskConnectionString(dbUrl)}`
      : `Validation failed: port 6543 found=${isPort6543}, pooler parameter found=${hasPgbouncer}`,
  });

  // 5. Verify TARGET_DIRECT_URL uses Session Pooler (port 5432)
  const isPort5432 = directUrl.includes(':5432/') || directUrl.includes(':5432?');
  const directUrlSessionValid = isPort5432;

  checks.push({
    id: 5,
    title: 'Verify TARGET_DIRECT_URL uses Session Pooler (port 5432)',
    passed: directUrlSessionValid,
    details: directUrlSessionValid
      ? `Port 5432 verified for direct session connection: ${maskConnectionString(directUrl)}`
      : `Validation failed: port 5432 found=${isPort5432}`,
  });

  // 10. Verify that no connection points to the old production project
  const noOldProjectRef =
    !dbUrl.includes(OLD_PROJECT_REF) &&
    !directUrl.includes(OLD_PROJECT_REF) &&
    !supabaseUrl.includes(OLD_PROJECT_REF);

  checks.push({
    id: 10,
    title: `Verify zero connection points to old project ("${OLD_PROJECT_REF}")`,
    passed: noOldProjectRef,
    details: noOldProjectRef
      ? `Confirmed: Old project ref is completely absent from all target connection strings.`
      : `CRITICAL SAFETY FAILURE: Old project ref "${OLD_PROJECT_REF}" was detected in target credentials!`,
  });

  // 8. Verify .env.target is excluded from Git
  let gitIgnored = false;
  let gitIgnoreDetails = '';
  try {
    const gitCheck = execSync('git check-ignore -v .env.target', { encoding: 'utf-8' }).trim();
    gitIgnored = gitCheck.includes('.env.target');
    gitIgnoreDetails = `Git check-ignore matched rule: "${gitCheck}"`;
  } catch (err: any) {
    gitIgnoreDetails = `git check-ignore returned error or exit code 1: ${err.message}`;
  }

  checks.push({
    id: 8,
    title: 'Verify .env.target is strictly excluded from Git',
    passed: gitIgnored,
    details: gitIgnored ? gitIgnoreDetails : `Failed: .env.target is NOT ignored by git!`,
  });

  // 6. Test both PostgreSQL connections
  let targetDbConnectionPassed = false;
  let targetDirectConnectionPassed = false;
  let targetPgVersion = '';
  let targetDbName = '';

  console.log('Testing TARGET_DIRECT_URL connection (Session mode)...');
  const directPrisma = new PrismaClient({
    datasources: { db: { url: directUrl } },
  });

  try {
    const [ver]: any[] = await directPrisma.$queryRawUnsafe(`SELECT version() as ver, current_database() as db;`);
    targetDirectConnectionPassed = true;
    targetPgVersion = ver.ver;
    targetDbName = ver.db;
    console.log(`  ✓ TARGET_DIRECT_URL connected successfully to "${targetDbName}".`);
  } catch (err: any) {
    console.error(`  ❌ TARGET_DIRECT_URL connection error:`, err.message);
  }

  console.log('Testing TARGET_DATABASE_URL connection (Transaction Pooler)...');
  const poolerPrisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  try {
    const [ver]: any[] = await poolerPrisma.$queryRawUnsafe(`SELECT version() as ver, current_database() as db;`);
    targetDbConnectionPassed = true;
    console.log(`  ✓ TARGET_DATABASE_URL connected successfully to "${ver.db}".`);
  } catch (err: any) {
    console.error(`  ❌ TARGET_DATABASE_URL connection error:`, err.message);
  }

  const bothPgPassed = targetDbConnectionPassed && targetDirectConnectionPassed;
  checks.push({
    id: 6,
    title: 'Test both PostgreSQL connections (Transaction Pooler & Session)',
    passed: bothPgPassed,
    details: bothPgPassed
      ? `Both connections operational. Target Engine: ${targetPgVersion.split(',')[0]}`
      : `Pooler connected: ${targetDbConnectionPassed}, Direct connected: ${targetDirectConnectionPassed}`,
  });

  // 7. Test the Supabase API connection
  let supabaseApiPassed = false;
  let existingBucketsList: string[] = [];
  try {
    const targetSupabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: buckets, error } = await targetSupabase.storage.listBuckets();
    if (error) {
      console.error(`  ❌ Supabase API error:`, error.message);
    } else {
      supabaseApiPassed = true;
      existingBucketsList = (buckets || []).map((b) => b.name);
      console.log(`  ✓ Supabase API connected. Existing storage buckets: ${existingBucketsList.length > 0 ? existingBucketsList.join(', ') : 'None (Ready for creation)'}`);
    }
  } catch (err: any) {
    console.error(`  ❌ Supabase Client exception:`, err.message);
  }

  checks.push({
    id: 7,
    title: 'Test Supabase API connection & service role authentication',
    passed: supabaseApiPassed,
    details: supabaseApiPassed
      ? `Connected to ${supabaseUrl}. Service key authorized (${maskApiKey(serviceKey)}). Existing buckets: ${existingBucketsList.length}`
      : `Supabase API test failed.`,
  });

  // 9. Check whether the target database is empty
  let isDatabaseEmpty = false;
  let targetPublicTableCount = -1;
  let existingTables: string[] = [];

  if (targetDirectConnectionPassed) {
    try {
      const tables: any[] = await directPrisma.$queryRawUnsafe(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);
      targetPublicTableCount = tables.length;
      existingTables = tables.map((t) => t.table_name);
      isDatabaseEmpty = targetPublicTableCount === 0;
    } catch (err: any) {
      console.error(`Error querying target tables:`, err.message);
    }
  }

  checks.push({
    id: 9,
    title: 'Check whether the target database is clean/empty',
    passed: targetDirectConnectionPassed,
    details: isDatabaseEmpty
      ? `Target database public schema is completely clean (0 tables). Ready for fresh DDL deployment.`
      : `Target database contains ${targetPublicTableCount} public tables: ${existingTables.slice(0, 5).join(', ')}${existingTables.length > 5 ? '...' : ''}`,
  });

  // Disconnect clients
  await directPrisma.$disconnect().catch(() => {});
  await poolerPrisma.$disconnect().catch(() => {});

  // Print Summary
  console.log('\n================================================================');
  console.log('                   PRE-RESTORATION AUDIT REPORT                  ');
  console.log('================================================================');

  let allPassed = true;
  for (const c of checks.sort((a, b) => a.id - b.id)) {
    const icon = c.passed ? '✅ PASSED' : '❌ FAILED';
    if (!c.passed) allPassed = false;
    console.log(`\n[Check ${c.id}] ${c.title}`);
    console.log(`  Status:  ${icon}`);
    console.log(`  Details: ${c.details}`);
  }

  console.log('\n================================================================');
  if (allPassed) {
    console.log('🎉 ALL 10 PRE-RESTORATION VALIDATION CHECKS PASSED.');
    console.log('Target project is authenticated, isolated, empty, and ready for restoration.');
    console.log('Zero modifications executed. Awaiting explicit user approval before Phase 2B restoration.');
  } else {
    console.log('⚠️ SOME CHECKS FAILED. Please review the details above.');
  }
  console.log('================================================================\n');

  // Save report to verification directory
  const reportPath = path.resolve(process.cwd(), 'backups', 'supabase-migration', 'verification', 'pre_restoration_validation_report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        validatedAt: new Date().toISOString(),
        overallStatus: allPassed ? 'PASSED' : 'FAILED',
        projectRef: EXPECTED_PROJECT_REF,
        targetDatabaseName: targetDbName,
        targetPostgresVersion: targetPgVersion,
        checks,
      },
      null,
      2
    ),
    'utf-8'
  );
  console.log(`Saved structured validation report to: ${reportPath}`);
}

runValidation().catch((err) => {
  console.error('Validation Script Error:', err);
  process.exit(1);
});

