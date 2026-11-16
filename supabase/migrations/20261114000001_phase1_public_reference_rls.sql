-- ============================================================================
-- SPR PHASE 1 MIGRATION: PUBLIC REFERENCE DATA RLS POLICIES & SECURITY BARRIER
--
-- Target Entities: Category, Subcategory, Level
-- Project: xfnhahqzywrxzozxrswq
-- Status: PREPARED & TESTED (DO NOT EXECUTE WITHOUT EXPLICIT APPROVAL)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. SECURITY PRE-REQUISITE: REVOKE ACCIDENTAL PUBLIC ACCESS TO SENSITIVE TABLES
-- ----------------------------------------------------------------------------
-- When tables are created by Prisma/pg_dump, PostgreSQL's public schema may grant
-- default SELECT privileges to the 'anon' role. We explicitly revoke all access
-- from 'anon' and 'authenticated' on sensitive models.
REVOKE ALL ON TABLE public."Student" FROM anon, authenticated;
REVOKE ALL ON TABLE public."StudentAccount" FROM anon, authenticated;
REVOKE ALL ON TABLE public."User" FROM anon, authenticated;
REVOKE ALL ON TABLE public."PerformanceRecord" FROM anon, authenticated;
REVOKE ALL ON TABLE public."EarningLedger" FROM anon, authenticated;
REVOKE ALL ON TABLE public."DailyAttendance" FROM anon, authenticated;
REVOKE ALL ON TABLE public."MonthlyAttendance" FROM anon, authenticated;
REVOKE ALL ON TABLE public."Exam" FROM anon, authenticated;
REVOKE ALL ON TABLE public."AuditLog" FROM anon, authenticated;
REVOKE ALL ON TABLE public."Session" FROM anon, authenticated;
REVOKE ALL ON TABLE public."PasswordResetToken" FROM anon, authenticated;

-- Also enable RLS on critical tables as defense-in-depth
ALTER TABLE public."Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StudentAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PerformanceRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EarningLedger" ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY ON PUBLIC REFERENCE TABLES
-- ----------------------------------------------------------------------------
ALTER TABLE public."Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Subcategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Level" ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. EXPLICITLY GRANT SELECT-ONLY TO CLIENT ROLES
-- ----------------------------------------------------------------------------
GRANT SELECT ON TABLE public."Category" TO anon, authenticated;
GRANT SELECT ON TABLE public."Subcategory" TO anon, authenticated;
GRANT SELECT ON TABLE public."Level" TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. STRICTLY REVOKE ALL WRITE PRIVILEGES FROM CLIENT ROLES
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."Category" FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."Subcategory" FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."Level" FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. CREATE SELECT POLICIES RESTRICTING TO ACTIVE RECORDS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read-only active categories" ON public."Category";
CREATE POLICY "Public read-only active categories"
ON public."Category"
FOR SELECT
TO anon, authenticated
USING ("active" = true);

DROP POLICY IF EXISTS "Public read-only active subcategories" ON public."Subcategory";
CREATE POLICY "Public read-only active subcategories"
ON public."Subcategory"
FOR SELECT
TO anon, authenticated
USING ("active" = true);

DROP POLICY IF EXISTS "Public read-only active levels" ON public."Level";
CREATE POLICY "Public read-only active levels"
ON public."Level"
FOR SELECT
TO anon, authenticated
USING ("active" = true);

-- ----------------------------------------------------------------------------
-- 6. VERIFICATION: PRISMA & SUPERUSER ACCESS
-- ----------------------------------------------------------------------------
-- The 'postgres' role used by Prisma bypasses RLS by default (table owner / BYPASSRLS).
-- Standard Vercel API routes and administrative operations remain 100% unaffected.

COMMIT;

