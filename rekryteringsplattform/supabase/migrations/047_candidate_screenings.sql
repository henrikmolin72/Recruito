-- Phase 2 of candidate pre-submission evaluation: stored AI screening reports.
--
-- When a recruiter runs the structured evaluation, the full markdown report is
-- generated server-side (Anthropic) and stored here so re-views are free and we
-- keep an EU AI Act audit trail (screening id, model version, CV hash, time).
--
-- Service-role-only: this table is read/written exclusively through server
-- routes/actions using createAdminClient(). No app client touches it directly,
-- so per CLAUDE.md §6 we OMIT the GRANT to authenticated/anon (RLS-protected,
-- service role bypasses RLS).

CREATE TABLE IF NOT EXISTS public.candidate_screenings (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    screening_id    uuid NOT NULL,
    candidate_id    uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    mandate_id      uuid NOT NULL,
    job_id          uuid NOT NULL,
    recruiter_user_id uuid NOT NULL,
    report_markdown text NOT NULL,
    model_version   text NOT NULL,
    cv_hash         text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Latest-report lookup per candidate+mandate is the hot read path.
CREATE INDEX IF NOT EXISTS candidate_screenings_candidate_mandate_idx
    ON public.candidate_screenings (candidate_id, mandate_id, created_at DESC);

-- RLS on, no policies: only the service role (admin client) can touch it.
ALTER TABLE public.candidate_screenings ENABLE ROW LEVEL SECURITY;
