-- ============================================================================
-- SPR PHASE 1 ROLLBACK: REVERT RLS POLICIES & GRANTS
-- Target: Revert to previous baseline without downtime
-- ============================================================================

BEGIN;

-- Drop RLS policies
DROP POLICY IF EXISTS "Public read-only active categories" ON public."Category";
DROP POLICY IF EXISTS "Public read-only active subcategories" ON public."Subcategory";
DROP POLICY IF EXISTS "Public read-only active levels" ON public."Level";

-- Revoke client SELECT grants
REVOKE SELECT ON TABLE public."Category" FROM anon, authenticated;
REVOKE SELECT ON TABLE public."Subcategory" FROM anon, authenticated;
REVOKE SELECT ON TABLE public."Level" FROM anon, authenticated;

-- Disable RLS
ALTER TABLE public."Category" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Subcategory" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Level" DISABLE ROW LEVEL SECURITY;

-- Disable RLS on sensitive tables if rollback to exact prior state is desired
ALTER TABLE public."Student" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."StudentAccount" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."PerformanceRecord" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."EarningLedger" DISABLE ROW LEVEL SECURITY;

COMMIT;
