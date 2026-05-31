-- Job pause / reopen workflow.
--   pause_reason: why the company (or the system) paused the job — mirrors the
--     existing close-reason UX, plus the automatic "Candidate Limit Reached".
--   close_reason: the closeJob action already writes this column, but it was
--     never created (schema drift) — add it here so that write succeeds.
--   reopen_nudge_sent_at: dedupe stamp for the "only N candidates left to
--     review, consider reopening" nudge; cleared when the job is resumed.
-- ALTER on an existing table — existing GRANTs apply, no new GRANT needed.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS pause_reason TEXT,
  ADD COLUMN IF NOT EXISTS close_reason TEXT,
  ADD COLUMN IF NOT EXISTS reopen_nudge_sent_at TIMESTAMPTZ;
