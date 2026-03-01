-- =============================================
-- 018: Placement automation & performance metrics
-- Adds columns for invoice/guarantee automation
-- and recruiter performance tracking
-- =============================================

-- Candidate: track placement linkage and guarantee dates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS placement_id UUID REFERENCES placements(id);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS invoice_created_at TIMESTAMPTZ;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS guarantee_start_date DATE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS guarantee_end_date DATE;

-- Placements: add notes, refund amount, guarantee_failed_at
ALTER TABLE placements ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE placements ADD COLUMN IF NOT EXISTS refund_amount INTEGER;
ALTER TABLE placements ADD COLUMN IF NOT EXISTS guarantee_failed_at TIMESTAMPTZ;
ALTER TABLE placements ADD COLUMN IF NOT EXISTS guarantee_failed_reason TEXT;
ALTER TABLE placements ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Recruiter performance metrics (materialized / cached)
ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS perf_hire_rate DECIMAL(5,2);
ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS perf_avg_time_to_hire_days INTEGER;
ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS perf_candidates_submitted INTEGER DEFAULT 0;
ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS perf_candidates_hired INTEGER DEFAULT 0;
ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS perf_active_placements INTEGER DEFAULT 0;
ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS perf_guarantee_success_rate DECIMAL(5,2);
ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS perf_last_calculated_at TIMESTAMPTZ;

-- Index for guarantee period automation queries
CREATE INDEX IF NOT EXISTS idx_placements_guarantee_end ON placements(guarantee_end_date)
  WHERE status = 'guarantee_active';

CREATE INDEX IF NOT EXISTS idx_placements_invoice_pending ON placements(status)
  WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_candidates_placement ON candidates(placement_id)
  WHERE placement_id IS NOT NULL;

-- =============================================
-- Function: Auto-create placement when candidate
-- moves to 'hired' status
-- =============================================
CREATE OR REPLACE FUNCTION fn_auto_create_placement()
RETURNS TRIGGER AS $$
DECLARE
  v_job RECORD;
  v_fee_pct DECIMAL(4,2);
  v_annual_salary INTEGER;
  v_total_fee INTEGER;
  v_platform_fee INTEGER;
  v_recruiter_fee INTEGER;
  v_guarantee_months INTEGER;
  v_start_date DATE;
  v_guarantee_end DATE;
  v_placement_id UUID;
BEGIN
  -- Only fire when status changes TO 'hired'
  IF NEW.status = 'hired' AND (OLD.status IS NULL OR OLD.status != 'hired') THEN

    -- Skip if placement already exists for this candidate
    IF EXISTS (SELECT 1 FROM placements WHERE candidate_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    SELECT j.id, j.company_id, j.fee_percentage, j.salary_min, j.salary_max,
           j.salary_currency, j.guarantee_period_months
      INTO v_job
      FROM jobs j WHERE j.id = NEW.job_id;

    IF v_job IS NULL THEN
      RETURN NEW;
    END IF;

    v_fee_pct := COALESCE(v_job.fee_percentage, 15);
    v_annual_salary := COALESCE(NEW.expected_salary, v_job.salary_max, v_job.salary_min, 0);
    v_total_fee := ROUND(v_annual_salary * v_fee_pct / 100);
    -- Platform keeps 30%, recruiter gets 70%
    v_platform_fee := ROUND(v_total_fee * 0.30);
    v_recruiter_fee := v_total_fee - v_platform_fee;
    v_guarantee_months := COALESCE(v_job.guarantee_period_months, 0);
    v_start_date := CURRENT_DATE;
    v_guarantee_end := v_start_date + (v_guarantee_months || ' months')::INTERVAL;

    INSERT INTO placements (
      candidate_id, job_id, company_id, recruiter_id,
      annual_salary, salary_currency, fee_percentage,
      total_fee, platform_fee, recruiter_fee,
      status, start_date, guarantee_end_date
    ) VALUES (
      NEW.id, NEW.job_id, v_job.company_id, NEW.recruiter_id,
      v_annual_salary, COALESCE(v_job.salary_currency, 'SEK'), v_fee_pct,
      v_total_fee, v_platform_fee, v_recruiter_fee,
      CASE WHEN v_guarantee_months > 0 THEN 'guarantee_active'::placement_status
           ELSE 'confirmed'::placement_status END,
      v_start_date, v_guarantee_end
    )
    RETURNING id INTO v_placement_id;

    -- Link placement back to candidate
    NEW.placement_id := v_placement_id;
    NEW.guarantee_start_date := v_start_date;
    NEW.guarantee_end_date := v_guarantee_end;

    -- Increment recruiter total_placements
    UPDATE recruiters SET total_placements = COALESCE(total_placements, 0) + 1
      WHERE id = NEW.recruiter_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_placement ON candidates;
CREATE TRIGGER trg_auto_create_placement
  BEFORE UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_create_placement();

-- =============================================
-- Function: Process guarantee period expiration
-- Called by scheduled cron or manual invocation
-- =============================================
CREATE OR REPLACE FUNCTION fn_process_guarantee_expirations()
RETURNS TABLE(placement_id UUID, action TEXT) AS $$
BEGIN
  -- Complete placements where guarantee has passed
  RETURN QUERY
  UPDATE placements p
    SET status = 'payout_released',
        completed_at = NOW(),
        payout_released_at = NOW()
    WHERE p.status = 'guarantee_active'
      AND p.guarantee_end_date <= CURRENT_DATE
    RETURNING p.id, 'guarantee_completed'::TEXT;

  -- Also update the candidate status to 'completed'
  UPDATE candidates c
    SET status = 'completed',
        status_changed_at = NOW()
    FROM placements p
    WHERE c.placement_id = p.id
      AND p.status = 'payout_released'
      AND p.completed_at = (SELECT MAX(completed_at) FROM placements WHERE completed_at IS NOT NULL)
      AND c.status IN ('hired', 'invoice_enabled', 'guarantee_tracking');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function: Handle guarantee failure (candidate
-- leaves during guarantee period)
-- =============================================
CREATE OR REPLACE FUNCTION fn_handle_guarantee_failure(
  p_placement_id UUID,
  p_reason TEXT DEFAULT 'Kandidaten lämnade under garantiperioden'
)
RETURNS VOID AS $$
DECLARE
  v_placement RECORD;
BEGIN
  SELECT * INTO v_placement FROM placements WHERE id = p_placement_id;
  IF v_placement IS NULL THEN
    RAISE EXCEPTION 'Placement not found: %', p_placement_id;
  END IF;

  IF v_placement.status != 'guarantee_active' THEN
    RAISE EXCEPTION 'Placement is not in guarantee_active status';
  END IF;

  UPDATE placements
    SET status = 'guarantee_failed',
        guarantee_failed_at = NOW(),
        guarantee_failed_reason = p_reason,
        refund_amount = v_placement.total_fee
    WHERE id = p_placement_id;

  -- Update candidate status
  UPDATE candidates
    SET status = 'completed',
        status_changed_at = NOW()
    WHERE placement_id = p_placement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function: Recalculate recruiter performance
-- metrics (called periodically or on events)
-- =============================================
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
    ELSE 100 END;

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
