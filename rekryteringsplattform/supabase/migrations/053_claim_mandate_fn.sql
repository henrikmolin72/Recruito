-- Atomic mandate-claim with a row lock on the job, closing the check-then-insert
-- race in claimMandate() (recruiter.ts) where two recruiters could both pass the
-- slot-cap check and exceed jobs.max_recruiters.
--
-- Locks the job row (FOR UPDATE), recounts active mandates under the lock, and
-- only then inserts. Returns a short status string the caller maps to a user
-- message:
--   ok       -> claimed
--   already  -> caller already holds an active mandate on this job
--   full     -> slot cap reached
--   notfound -> job does not exist
--
-- job_mandates columns: id, job_id, recruiter_id, is_active, claimed_at,
-- released_at. claimed_at/released_at/id/is_active all have defaults, so the
-- insert only needs job_id + recruiter_id (mirrors claimMandate()'s insert).

CREATE OR REPLACE FUNCTION public.claim_mandate(p_job_id uuid, p_recruiter_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_max    int;
    v_count  int;
    v_exists int;
BEGIN
    -- Row lock serializes concurrent claims on the same job.
    SELECT max_recruiters INTO v_max FROM public.jobs WHERE id = p_job_id FOR UPDATE;
    IF v_max IS NULL THEN
        RETURN 'notfound';
    END IF;

    SELECT count(*) INTO v_count
      FROM public.job_mandates
     WHERE job_id = p_job_id AND is_active = true;

    SELECT count(*) INTO v_exists
      FROM public.job_mandates
     WHERE job_id = p_job_id AND recruiter_id = p_recruiter_id AND is_active = true;

    IF v_exists > 0 THEN
        RETURN 'already';
    END IF;

    IF v_count >= v_max THEN
        RETURN 'full';
    END IF;

    INSERT INTO public.job_mandates (job_id, recruiter_id, is_active)
    VALUES (p_job_id, p_recruiter_id, true);

    RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_mandate(uuid, uuid) TO authenticated;
