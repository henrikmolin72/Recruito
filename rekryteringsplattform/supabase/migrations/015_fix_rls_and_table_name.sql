-- =============================================
-- FIX: Enable RLS on jobs + rename recruiter_mandates to job_mandates
-- =============================================

-- 1. Enable RLS on jobs table
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- 2. Rename recruiter_mandates → job_mandates to match application code
ALTER TABLE IF EXISTS recruiter_mandates RENAME TO job_mandates;

-- 3. Enable RLS on job_mandates (the renamed table)
ALTER TABLE job_mandates ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for jobs (idempotent with IF NOT EXISTS-style drops)
DROP POLICY IF EXISTS "Active jobs visible to all auth users" ON jobs;
CREATE POLICY "Active jobs visible to all auth users"
  ON jobs FOR SELECT USING (
    status = 'active'
    OR company_id = get_company_id()
    OR is_admin()
  );

DROP POLICY IF EXISTS "Companies can insert own jobs" ON jobs;
CREATE POLICY "Companies can insert own jobs"
  ON jobs FOR INSERT WITH CHECK (company_id = get_company_id());

DROP POLICY IF EXISTS "Companies can update own jobs" ON jobs;
CREATE POLICY "Companies can update own jobs"
  ON jobs FOR UPDATE USING (company_id = get_company_id() OR is_admin());

-- 5. Create RLS policies for job_mandates (idempotent)
DROP POLICY IF EXISTS "Mandates visible to job owner and mandate recruiter" ON job_mandates;
CREATE POLICY "Mandates visible to job owner and mandate recruiter"
  ON job_mandates FOR SELECT USING (
    recruiter_id = get_recruiter_id()
    OR job_id IN (SELECT id FROM jobs WHERE company_id = get_company_id())
    OR is_admin()
  );

DROP POLICY IF EXISTS "Approved recruiters can claim mandates" ON job_mandates;
CREATE POLICY "Approved recruiters can claim mandates"
  ON job_mandates FOR INSERT WITH CHECK (
    recruiter_id = get_recruiter_id()
    AND EXISTS(
      SELECT 1 FROM recruiters
      WHERE id = get_recruiter_id()
        AND approval_status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Recruiters can release own mandates" ON job_mandates;
CREATE POLICY "Recruiters can release own mandates"
  ON job_mandates FOR UPDATE USING (
    recruiter_id = get_recruiter_id() OR is_admin()
  );
