-- Lock fees at job level. Calculator becomes an estimate only;
-- jobs.client_fee_amount / recruiter_fee_amount are the source of truth once set.
--
-- Backfill preserves currently displayed numbers: client_fee_amount =
-- round(avg_salary × fee_percentage / 100). Existing rows default is_exclusive=false.

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS is_exclusive boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS client_fee_amount numeric,
    ADD COLUMN IF NOT EXISTS recruiter_fee_amount numeric;

UPDATE jobs
SET client_fee_amount = ROUND(
        ((COALESCE(salary_min, 0) + COALESCE(salary_max, salary_min, 0))::numeric / 2)
        * (COALESCE(fee_percentage, 15)::numeric / 100)
    )
WHERE client_fee_amount IS NULL
    AND COALESCE(salary_min, salary_max) IS NOT NULL;

UPDATE jobs
SET recruiter_fee_amount = FLOOR(
        COALESCE(salary_max, salary_min, 0)::numeric
        * (COALESCE(recruiter_fee_percentage, 7)::numeric / 100)
        / 100
    ) * 100
WHERE recruiter_fee_amount IS NULL
    AND COALESCE(salary_min, salary_max) IS NOT NULL;

COMMENT ON COLUMN jobs.client_fee_amount IS
    'Locked client fee in salary_currency. Set on creation via calculateClientFee, editable by admin until approval.';
COMMENT ON COLUMN jobs.recruiter_fee_amount IS
    'Locked recruiter payout in salary_currency. Defaults to 7% of salary floored to nearest 100.';
COMMENT ON COLUMN jobs.is_exclusive IS
    'True if the assignment is exclusive — used by client-fee formula (-10%).';
