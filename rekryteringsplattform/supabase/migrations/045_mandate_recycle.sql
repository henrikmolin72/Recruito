-- Mandate recycling: allow a recruiter to retake an expired job as a NEW cycle.
--
-- The expiry cron now auto-releases an expired mandate (is_active=false,
-- released_at set). The job then reappears in the recruiter's available list
-- with the "Already Worked" tag, and the recruiter can take it again. Each
-- retake inserts a FRESH job_mandates row (new claimed_at => fresh 10-day
-- clock), so we need to allow multiple rows per (job_id, recruiter_id) as long
-- as only one is active.
--
-- Replaces the original UNIQUE(job_id, recruiter_id) table constraint with a
-- partial unique index that only constrains ACTIVE mandates. Released rows
-- (past cycles) accumulate as history and no longer block a new claim.
--
-- ALTER on an existing table — existing GRANTs apply, no new GRANT needed.

-- Drop whatever unique constraint currently exists on job_mandates. The name
-- differs by history: the table was renamed recruiter_mandates -> job_mandates
-- (migration 015), and a rename does not rename constraints — so the
-- constraint may be job_mandates_job_id_recruiter_id_key OR
-- recruiter_mandates_job_id_recruiter_id_key. Drop by discovered name.
DO $$
DECLARE
    conname_to_drop text;
BEGIN
    SELECT conname INTO conname_to_drop
    FROM pg_constraint
    WHERE conrelid = 'public.job_mandates'::regclass
      AND contype = 'u';

    IF conname_to_drop IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.job_mandates DROP CONSTRAINT %I', conname_to_drop);
    END IF;
END $$;

-- Only one ACTIVE mandate per recruiter per job. Past (released) cycles are
-- unconstrained, so a recruiter can retake a job after their previous mandate
-- expired and was released. Duplicate active claims still raise 23505, which
-- claimMandate() maps to "Du har redan tagit detta uppdrag".
CREATE UNIQUE INDEX IF NOT EXISTS job_mandates_active_unique
    ON public.job_mandates (job_id, recruiter_id)
    WHERE is_active;
