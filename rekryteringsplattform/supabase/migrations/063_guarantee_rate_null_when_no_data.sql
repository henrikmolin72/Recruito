-- 063: Guarantee success rate is NULL (no data) until a guarantee has actually completed.
-- Previously fn_recalculate_recruiter_metrics defaulted to 100 when a recruiter had zero
-- completed guarantees, so dashboards showed "Guarantee result 100%" for recruiters with
-- no candidate ever in guarantee. NULL now means "no result yet" and the UI renders "—".
-- (062 is reserved by the email-suppression branch.)

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
      AND status IN ('payout_released', 'guarantee_failed');

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill: clear the fake 100% for recruiters that have never had a guarantee complete.
UPDATE recruiters r
SET perf_guarantee_success_rate = NULL
WHERE NOT EXISTS (
    SELECT 1 FROM placements p
    WHERE p.recruiter_id = r.id
      AND p.status IN ('payout_released', 'guarantee_failed')
);
