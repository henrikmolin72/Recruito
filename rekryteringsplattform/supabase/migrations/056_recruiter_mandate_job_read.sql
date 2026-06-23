-- 056_recruiter_mandate_job_read.sql
--
-- Bug: a job's title "changed" for recruiters once it left the `active` status
-- (e.g. after a hire closed/filled it). Root cause was read access, not data:
-- the jobs SELECT policy only let recruiters see a job while `status = 'active'`,
-- so once filled/closed/paused the `job:jobs(title)` join returned null and the
-- recruiter UI fell back to "Okänt jobb" (Unknown job). Company (owner) and admin
-- branches were unaffected, which is why only the recruiter side regressed.
--
-- Fix: a recruiter who holds (or held) a mandate on a job keeps SELECT access to
-- that job row for its whole lifecycle. This is the exact access they already had
-- while the job was active — no new data is exposed, and it stays scoped to the
-- recruiter's own mandates via get_recruiter_id(). The job title now stays stable
-- across recruiter, corporate, and admin views regardless of workflow.

DROP POLICY IF EXISTS "Active jobs visible to all auth users" ON public.jobs;
CREATE POLICY "Active jobs visible to all auth users"
  ON public.jobs FOR SELECT USING (
    status = 'active'
    OR company_id = get_company_id()
    OR is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.job_mandates jm
      WHERE jm.job_id = jobs.id
        AND jm.recruiter_id = get_recruiter_id()
    )
  );
