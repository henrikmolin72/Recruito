-- 073: (a) backfill hired_at lost by company-driven hires, (b) count
-- refund_processing as a failed guarantee, (c) refresh all perf snapshots.
-- No new tables → no GRANT needed.

UPDATE candidates c
SET hired_at = h.first_hired
FROM (
    SELECT candidate_id, MIN(created_at) AS first_hired
    FROM candidate_stage_history
    WHERE action = 'hire'
    GROUP BY candidate_id
) h
WHERE c.id = h.candidate_id
  AND c.hired_at IS NULL;

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
  -- Total candidates submitted
  SELECT COUNT(*) INTO v_submitted
    FROM candidates WHERE recruiter_id = p_recruiter_id;

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
    perf_avg_time_to_hire_days = COALESCE(v_avg_days, 0),
    perf_active_placements = v_active,
    perf_guarantee_success_rate = v_guarantee_rate,
    perf_last_calculated_at = NOW()
  WHERE id = p_recruiter_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Refresh every snapshot so backfilled hired_at + new rate rules show immediately.
SELECT fn_recalculate_recruiter_metrics(id) FROM recruiters;
