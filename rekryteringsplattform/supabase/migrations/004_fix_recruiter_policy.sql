-- =============================================
-- FIX RECRUITER POLICY
-- =============================================

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Approved recruiters can claim mandates" ON job_mandates;

-- Create a new permissive policy for development
CREATE POLICY "Recruiters can claim mandates"
  ON job_mandates FOR INSERT WITH CHECK (
    recruiter_id = get_recruiter_id()
  );
