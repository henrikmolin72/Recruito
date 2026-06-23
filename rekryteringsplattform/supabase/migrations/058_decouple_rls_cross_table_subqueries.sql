-- 058_decouple_rls_cross_table_subqueries.sql
--
-- DEFENSE-IN-DEPTH follow-up to the 2026-06-23 RLS recursion outage
-- (see Decisions/2026-06-23-rls-recursion-jobs-policy-outage.md, migrations 056→057).
--
-- 057 fixed the live recursion by routing the jobs policy's recruiter-mandate
-- check through a SECURITY DEFINER helper. But three pre-existing policies (from
-- migration 021) still embed a RAW cross-table subquery against public.jobs:
--   * job_mandates SELECT  ("Mandates visible to job owner and mandate recruiter")
--   * candidates  SELECT   ("Candidates visible to presenting recruiter and job company")
--   * candidates  UPDATE   ("Recruiter and company can update candidates")
-- each containing:  job_id IN (SELECT id FROM public.jobs WHERE company_id = get_company_id())
--
-- That raw subquery reads jobs UNDER RLS, so it evaluates the jobs SELECT policy.
-- It is safe TODAY only because the jobs policy's sole job_mandates-touching branch
-- is now a SECURITY DEFINER call (recruiter_holds_job_mandate). If anyone ever
-- re-adds a raw cross-table subquery to the jobs policy, the mutual recursion
-- (jobs -> job_mandates -> jobs, 42P17) returns and breaks company + recruiter
-- dashboards again.
--
-- FIX: move the "does the caller's company own this job?" check into a
-- SECURITY DEFINER helper (mirrors get_company_id()/get_recruiter_id()/is_admin()
-- and recruiter_holds_job_mandate()). A SECURITY DEFINER function runs as its
-- owner, so its internal read of public.jobs bypasses RLS — these policies no
-- longer evaluate the jobs policy at all. No raw cross-table policy subqueries
-- remain, so this class of recursion cannot be reintroduced by editing one policy.
--
-- Access semantics are unchanged: company_owns_job(job_id) is true iff the job
-- exists and its company_id equals the caller's company (get_company_id()), which
-- is exactly what "job_id IN (SELECT id FROM jobs WHERE company_id = get_company_id())"
-- resolved to (jobs RLS already exposes a company its own jobs for every status).
-- For recruiters/admins with no company row, get_company_id() is NULL and the
-- predicate is false — identical to the old subquery.

CREATE OR REPLACE FUNCTION public.company_owns_job(p_job_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = p_job_id
      AND j.company_id = public.get_company_id()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = '';

-- job_mandates SELECT
DROP POLICY IF EXISTS "Mandates visible to job owner and mandate recruiter" ON public.job_mandates;
CREATE POLICY "Mandates visible to job owner and mandate recruiter"
  ON public.job_mandates FOR SELECT USING (
    recruiter_id = public.get_recruiter_id()
    OR public.company_owns_job(job_id)
    OR public.is_admin()
  );

-- candidates SELECT
DROP POLICY IF EXISTS "Candidates visible to presenting recruiter and job company" ON public.candidates;
CREATE POLICY "Candidates visible to presenting recruiter and job company"
  ON public.candidates FOR SELECT USING (
    recruiter_id = public.get_recruiter_id()
    OR public.company_owns_job(job_id)
    OR public.is_admin()
  );

-- candidates UPDATE
DROP POLICY IF EXISTS "Recruiter and company can update candidates" ON public.candidates;
CREATE POLICY "Recruiter and company can update candidates"
  ON public.candidates FOR UPDATE USING (
    recruiter_id = public.get_recruiter_id()
    OR public.company_owns_job(job_id)
    OR public.is_admin()
  );
