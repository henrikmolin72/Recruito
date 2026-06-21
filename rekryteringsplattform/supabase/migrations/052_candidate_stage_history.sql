-- Candidate stage-progression audit trail.
--
-- Every company-stage transition (move / reject / reopen / withdraw / hire) and
-- system cascade (position filled -> reject the rest) writes one immutable row
-- here. Used to render the candidate timeline and for support/audit lookups.
--
-- Writes happen exclusively via the admin/service-role client (createAdminClient,
-- which bypasses RLS) from the stage-history helper, so there is no INSERT policy
-- and no INSERT grant for authenticated. Only SELECT is exposed to the involved
-- company and recruiter (mirrors the candidates table SELECT scope).

CREATE TABLE IF NOT EXISTS public.candidate_stage_history (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id    uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    job_id          uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    from_stage      text,
    to_stage        text NOT NULL,
    action          text NOT NULL DEFAULT 'move',   -- move | reject | reopen | withdraw | hire
    changed_by      uuid REFERENCES auth.users(id),
    changed_by_role text,                            -- company | recruiter | admin | system
    reason          text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Timeline read path: most-recent-first per candidate.
CREATE INDEX IF NOT EXISTS candidate_stage_history_candidate_created_idx
    ON public.candidate_stage_history (candidate_id, created_at DESC);

ALTER TABLE public.candidate_stage_history ENABLE ROW LEVEL SECURITY;

-- Visible to the company that owns the job (company.user_id = auth.uid()) OR the
-- recruiter presenting the candidate (recruiter.user_id = auth.uid()). Mirrors
-- the candidates SELECT policy via the same get_company_id()/get_recruiter_id()
-- helpers (each is `SELECT id FROM <table> WHERE user_id = auth.uid()`).
-- DROP-then-CREATE so re-applying this migration (e.g. pasting into the SQL
-- editor, which doesn't consult migration tracking) doesn't fail with 42710.
DROP POLICY IF EXISTS "Stage history visible to job company and candidate recruiter"
  ON public.candidate_stage_history;
CREATE POLICY "Stage history visible to job company and candidate recruiter"
  ON public.candidate_stage_history FOR SELECT USING (
    job_id IN (SELECT id FROM public.jobs WHERE company_id = public.get_company_id())
    OR candidate_id IN (SELECT id FROM public.candidates WHERE recruiter_id = public.get_recruiter_id())
    OR public.is_admin()
  );

GRANT SELECT ON public.candidate_stage_history TO authenticated;
