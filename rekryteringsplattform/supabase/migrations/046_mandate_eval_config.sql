-- Candidate pre-submission evaluation: per-mandate scoring config.
--
-- The recruiter runs a structured AI screening prompt on a candidate before
-- submitting them to the client. That prompt needs role-level scoring inputs
-- that don't otherwise exist in the schema: the target sector, which adjacent
-- sectors are acceptable, which transferable skills to credit, and any custom
-- role-expansion keywords.
--
-- These live on job_mandates (not jobs) because the recruiter owns the mandate
-- and runs the evaluation; cv-match already keys off mandate_id, and a single
-- job can carry multiple mandates (one per recruiter), each with its own lens.
-- The config is set once per mandate and reused across every candidate in it.
--
-- ALTER on an existing table — existing GRANTs apply, no new GRANT needed.

ALTER TABLE public.job_mandates
    ADD COLUMN IF NOT EXISTS eval_target_sector text,
    ADD COLUMN IF NOT EXISTS eval_adjacent_sectors text[],
    ADD COLUMN IF NOT EXISTS eval_transferable_skills text[],
    ADD COLUMN IF NOT EXISTS eval_custom_keywords text[];
