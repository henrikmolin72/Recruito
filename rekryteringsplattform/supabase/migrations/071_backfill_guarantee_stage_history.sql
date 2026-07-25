-- Backfill guarantee-lifecycle rows in candidate_stage_history.
--
-- Guarantee-lifecycle logging (hired -> guarantee_tracking on activation,
-- guarantee_tracking -> completed on payout, guarantee_tracking ->
-- guarantee_failed on breach) only started with d51c619 (2026-07-08), so
-- placements whose lifecycle ran before that show no guarantee entries in the
-- candidate timeline (client report 2026-07-25). This synthesizes the missing
-- rows from timestamps already stored on the placements row.
--
-- Timestamps are best-effort: activation uses payment_received_at (the admin
-- action that historically activated tracking), falling back to joining_date /
-- start_date / created_at for rows that predate those columns.
--
-- Idempotent: each insert skips candidates that already have a history row
-- with that to_stage (live-logged or previously backfilled). placements has
-- UNIQUE(candidate_id), so each select yields at most one row per candidate.
-- status is compared as text so unknown enum labels never error.

-- 1) Guarantee started: any placement whose guarantee tracking activated.
INSERT INTO public.candidate_stage_history
    (candidate_id, job_id, from_stage, to_stage, action, changed_by, changed_by_role, reason, created_at)
SELECT
    p.candidate_id,
    p.job_id,
    'hired',
    'guarantee_tracking',
    'move',
    NULL, -- acting admin user id was not recorded at the time
    'admin',
    NULL,
    COALESCE(p.payment_received_at, p.joining_date::timestamptz, p.start_date::timestamptz, p.created_at)
FROM public.placements p
WHERE (
        p.status::text IN ('guarantee_active', 'payout_released', 'guarantee_failed', 'refund_processing', 'completed')
        OR p.payout_released_at IS NOT NULL
        OR p.guarantee_failed_at IS NOT NULL
      )
  AND NOT EXISTS (
    SELECT 1 FROM public.candidate_stage_history h
    WHERE h.candidate_id = p.candidate_id AND h.to_stage = 'guarantee_tracking'
  );

-- 2) Guarantee completed & paid: payout released.
INSERT INTO public.candidate_stage_history
    (candidate_id, job_id, from_stage, to_stage, action, changed_by, changed_by_role, reason, created_at)
SELECT
    p.candidate_id,
    p.job_id,
    'guarantee_tracking',
    'completed',
    'move',
    NULL,
    'admin',
    NULL,
    COALESCE(p.payout_released_at, p.completed_at, now())
FROM public.placements p
WHERE (p.status::text IN ('payout_released', 'completed') OR p.payout_released_at IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM public.candidate_stage_history h
    WHERE h.candidate_id = p.candidate_id AND h.to_stage = 'completed'
  );

-- 3) Guarantee failed: breach recorded.
INSERT INTO public.candidate_stage_history
    (candidate_id, job_id, from_stage, to_stage, action, changed_by, changed_by_role, reason, created_at)
SELECT
    p.candidate_id,
    p.job_id,
    'guarantee_tracking',
    'guarantee_failed',
    'move',
    NULL,
    'admin',
    p.guarantee_failed_reason,
    COALESCE(p.guarantee_failed_at, now())
FROM public.placements p
WHERE (p.status::text IN ('guarantee_failed', 'refund_processing') OR p.guarantee_failed_at IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM public.candidate_stage_history h
    WHERE h.candidate_id = p.candidate_id AND h.to_stage = 'guarantee_failed'
  );
