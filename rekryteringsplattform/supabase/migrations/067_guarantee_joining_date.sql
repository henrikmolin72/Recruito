-- =============================================
-- 067: Guarantee starts at the confirmed joining date, not at hire
--
-- Candidates usually serve a notice period after being marked hired, so the
-- guarantee must not start until the client confirms the candidate actually
-- joined. Admin enters placements.joining_date; the app computes
-- guarantee_end_date = joining_date + jobs.guarantee_period_months
-- (manual override allowed) and only then activates the guarantee.
--
-- Safe to re-run (idempotent). Apply in the Supabase SQL editor.
-- =============================================

-- 1) New column: the client-confirmed date the candidate officially joined.
ALTER TABLE placements ADD COLUMN IF NOT EXISTS joining_date DATE;

-- 2) The end date is unknown until the joining date is entered.
ALTER TABLE placements ALTER COLUMN guarantee_end_date DROP NOT NULL;

-- 3) Auto-create placement at hire WITHOUT starting the guarantee.
--    Identical to the 018 version except: status is always 'confirmed',
--    guarantee_end_date stays NULL, and the candidate guarantee-date
--    mirrors are no longer stamped with the hire date.
CREATE OR REPLACE FUNCTION fn_auto_create_placement()
RETURNS TRIGGER AS $$
DECLARE
  v_job RECORD;
  v_fee_pct DECIMAL(4,2);
  v_annual_salary INTEGER;
  v_total_fee INTEGER;
  v_platform_fee INTEGER;
  v_recruiter_fee INTEGER;
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

    INSERT INTO placements (
      candidate_id, job_id, company_id, recruiter_id,
      annual_salary, salary_currency, fee_percentage,
      total_fee, platform_fee, recruiter_fee,
      status, start_date, guarantee_end_date
    ) VALUES (
      NEW.id, NEW.job_id, v_job.company_id, NEW.recruiter_id,
      v_annual_salary, COALESCE(v_job.salary_currency, 'SEK'), v_fee_pct,
      v_total_fee, v_platform_fee, v_recruiter_fee,
      'confirmed'::placement_status,
      CURRENT_DATE, NULL
    )
    RETURNING id INTO v_placement_id;

    -- Link placement back to candidate (guarantee dates set once joining is confirmed)
    NEW.placement_id := v_placement_id;

    -- Increment recruiter total_placements
    UPDATE recruiters SET total_placements = COALESCE(total_placements, 0) + 1
      WHERE id = NEW.recruiter_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Backfill: existing placements were activated at hire, so their guarantee
--    effectively started on start_date. Keep their current end dates/statuses
--    (no retroactive change to in-flight guarantees).
UPDATE placements SET joining_date = start_date WHERE joining_date IS NULL;
