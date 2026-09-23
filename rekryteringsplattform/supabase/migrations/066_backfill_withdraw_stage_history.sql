-- Backfill missing "withdraw" rows in candidate_stage_history.
--
-- withdrawCandidate() historically updated candidates.status to
-- 'candidate_withdrawn' without appending an audit row, so withdrawn
-- candidates showed no "Withdrawn" entry in the stage-history timeline
-- (admin/recruiter/company candidate pages). The action now logs; this
-- backfills the rows for candidates withdrawn before the fix, using the
-- withdrawal timestamp and reason already stored on the candidates row.
--
-- Idempotent: skips candidates that already have a withdraw history row.

INSERT INTO public.candidate_stage_history
    (candidate_id, job_id, from_stage, to_stage, action, changed_by, changed_by_role, reason, created_at)
SELECT
    c.id,
    c.job_id,
    c.company_stage,
    'withdrawn',
    'withdraw',
    NULL, -- acting recruiter user id was not recorded at withdrawal time
    'recruiter',
    CASE c.withdraw_reason
        WHEN 'candidate_no_longer_interested'         THEN 'Candidate no longer interested'
        WHEN 'candidate_accepted_another_offer'       THEN 'Candidate accepted another offer'
        WHEN 'candidate_unavailable_for_interviews'   THEN 'Candidate unavailable for interviews'
        WHEN 'candidate_declined_offer'               THEN 'Candidate declined the offer'
        WHEN 'candidate_withdrew_after_interview'     THEN 'Candidate withdrew after interview'
        WHEN 'candidate_withdrew_during_notice_period' THEN 'Candidate withdrew during notice period'
        WHEN 'candidate_requested_profile_removal'    THEN 'Candidate requested profile removal'
        WHEN 'recruiter_unable_to_continue'           THEN 'Recruiter unable to continue representation'
        WHEN 'duplicate_candidate_submission'         THEN 'Duplicate candidate submission'
        WHEN 'other'                                  THEN 'Other'
        ELSE c.withdraw_reason
    END,
    COALESCE(c.withdrawn_at, c.status_changed_at, now())
FROM public.candidates c
WHERE c.status = 'candidate_withdrawn'
  AND NOT EXISTS (
    SELECT 1 FROM public.candidate_stage_history h
    WHERE h.candidate_id = c.id AND h.action = 'withdraw'
  );
