-- 057_fix_jobs_rls_recursion.sql
--
-- INCIDENT: After 056 shipped, company AND recruiter users could log in but then
-- hit a "browsing error" (the dashboard 500'd); admin was unaffected.
--
-- ROOT CAUSE: 056 added a RAW subquery to the jobs SELECT policy:
--     OR EXISTS (SELECT 1 FROM public.job_mandates jm
--                WHERE jm.job_id = jobs.id AND jm.recruiter_id = get_recruiter_id())
-- That subquery reads job_mandates, so it is itself evaluated under job_mandates'
-- RLS. But job_mandates' SELECT policy contains
--     job_id IN (SELECT id FROM public.jobs WHERE company_id = get_company_id())
-- and candidates' SELECT policy contains the same "SELECT id FROM public.jobs ...".
-- The result is mutual recursion: jobs -> job_mandates -> jobs -> ...
-- Postgres aborts every such read with
--     42P17 "infinite recursion detected in policy for relation \"jobs\"".
-- So every RLS-scoped read of jobs / job_mandates / candidates started failing.
-- The company & recruiter dashboards surface that as a thrown error (handleError),
-- i.e. a 500. Admin reads via the service-role client, which bypasses RLS, so it
-- kept working.
--
-- FIX: move the recruiter-mandate check into a SECURITY DEFINER function, exactly
-- like the existing get_company_id()/get_recruiter_id()/is_admin() helpers. A
-- SECURITY DEFINER function runs as its owner, so its internal read of
-- job_mandates is NOT subject to RLS — which breaks the cycle while granting the
-- identical access (a recruiter who holds/held a mandate can read that job for its
-- whole lifecycle). No new data is exposed.

CREATE OR REPLACE FUNCTION public.recruiter_holds_job_mandate(p_job_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.job_mandates jm
    WHERE jm.job_id = p_job_id
      AND jm.recruiter_id = public.get_recruiter_id()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = '';

DROP POLICY IF EXISTS "Active jobs visible to all auth users" ON public.jobs;
CREATE POLICY "Active jobs visible to all auth users"
  ON public.jobs FOR SELECT USING (
    status = 'active'
    OR company_id = public.get_company_id()
    OR public.is_admin()
    OR public.recruiter_holds_job_mandate(id)
  );
