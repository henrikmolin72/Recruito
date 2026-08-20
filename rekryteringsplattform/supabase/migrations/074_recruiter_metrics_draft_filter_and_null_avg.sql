-- 074: two recruiter-metrics accuracy fixes (code review 2026-08-20, both LOW).
--   (a) v_submitted excludes draft candidates — the dashboard interview/hire-rate
--       numerator already excludes drafts, so counting them in the denominator
--       skewed the rates low (and left a latent >100% window).
--   (b) avg time-to-hire stays NULL when nobody has been hired, instead of
--       COALESCE-ing to 0 — same no-data class as the guarantee rate (a fake
--       "0 days" reads as instant hires). The column is already nullable INTEGER
--       (migration 018); the UI renders NULL as "—".
-- CREATE OR REPLACE supersedes 073's definition. No new table → no GRANT.

CREATE OR REPLACE FUNCTION fn_recalculate_recruiter_metrics(p_recruiter_id UUID)
RETURNS VOID AS $$
DECLARE
  v_submitted INTEGER;
  v_hired INTEGER;
  v_hire_rate DECIMAL(5,2);
  v_avg_days INTEGER;
  v_active INTEGER;
  v_guarantee_total INTEGER;
  v_guarantee_passed INTEGER;
  v_guarantee_rate DECIMAL(5,2);
BEGIN
  -- Total candidates submitted (drafts are not submissions → excluded so the
  -- rate denominator matches the interview/hire numerators).
  SELECT COUNT(*) INTO v_submitted
    FROM candidates WHERE recruiter_id = p_recruiter_id
      AND status <> 'draft';

  -- Candidates that reached 'hired' or beyond
  SELECT COUNT(*) INTO v_hired
    FROM candidates WHERE recruiter_id = p_recruiter_id
      AND status IN ('hired', 'invoice_enabled', 'guarantee_tracking', 'completed');

  -- Hire rate
  v_hire_rate := CASE WHEN v_submitted > 0
    THEN ROUND((v_hired::DECIMAL / v_submitted) * 100, 2)
    ELSE 0 END;

  -- Average time to hire (submitted_at → hired_at)
  SELECT ROUND(AVG(EXTRACT(EPOCH FROM (hired_at - submitted_at)) / 86400))::INTEGER
    INTO v_avg_days
    FROM candidates
    WHERE recruiter_id = p_recruiter_id AND hired_at IS NOT NULL;

  -- Active placements in guarantee
  SELECT COUNT(*) INTO v_active
    FROM placements WHERE recruiter_id = p_recruiter_id AND status = 'guarantee_active';

  -- Guarantee success rate
  SELECT COUNT(*) INTO v_guarantee_total
    FROM placements WHERE recruiter_id = p_recruiter_id
      -- refund_processing IS a failed guarantee (guarantee.ts + FAILED_PLACEMENT_STATUSES)
      AND status IN ('payout_released', 'guarantee_failed', 'refund_processing');

  SELECT COUNT(*) INTO v_guarantee_passed
    FROM placements WHERE recruiter_id = p_recruiter_id
      AND status = 'payout_released';

  v_guarantee_rate := CASE WHEN v_guarantee_total > 0
    THEN ROUND((v_guarantee_passed::DECIMAL / v_guarantee_total) * 100, 2)
    ELSE NULL END;

  UPDATE recruiters SET
    perf_candidates_submitted = v_submitted,
    perf_candidates_hired = v_hired,
    perf_hire_rate = v_hire_rate,
    -- NULL (not 0) when no candidate has been hired yet → UI shows "—".
    perf_avg_time_to_hire_days = v_avg_days,
    perf_active_placements = v_active,
    perf_guarantee_success_rate = v_guarantee_rate,
    perf_last_calculated_at = NOW()
  WHERE id = p_recruiter_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Refresh every snapshot so the corrected denominator + NULL avg show immediately.
SELECT fn_recalculate_recruiter_metrics(id) FROM recruiters;
