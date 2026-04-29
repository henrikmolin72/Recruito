-- 034_client_fee_reconfirm.sql
-- Client fee re-confirmation flow. Adds the consent state around client_fee_amount.
-- Pattern for adding enum value follows migration 030_process_flow_gates.sql.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'job_status'::regtype
          AND enumlabel = 'pending_client_reconfirm'
    ) THEN
        ALTER TYPE job_status ADD VALUE 'pending_client_reconfirm' AFTER 'pending_approval';
    END IF;
END $$;

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS client_fee_amount_estimated numeric,
    ADD COLUMN IF NOT EXISTS client_fee_amount_proposed numeric,
    ADD COLUMN IF NOT EXISTS client_fee_uplift_reason text,
    ADD COLUMN IF NOT EXISTS client_fee_uplift_note text,
    ADD COLUMN IF NOT EXISTS client_fee_reconfirm_requested_at timestamptz,
    ADD COLUMN IF NOT EXISTS client_fee_reconfirm_resolved_at timestamptz,
    ADD COLUMN IF NOT EXISTS client_fee_reconfirm_decision text;

UPDATE jobs
SET client_fee_amount_estimated = client_fee_amount
WHERE status = 'pending_approval'
  AND client_fee_amount_estimated IS NULL
  AND client_fee_amount IS NOT NULL;

COMMENT ON COLUMN jobs.client_fee_amount_estimated IS
    'Fee the client ticked the declaration for. Set once on submit. Never mutated.';
COMMENT ON COLUMN jobs.client_fee_amount_proposed IS
    'Higher amount admin wants to charge. Set on entering pending_client_reconfirm. Cleared on resolve.';
COMMENT ON COLUMN jobs.client_fee_uplift_reason IS
    'One of: hard_to_fill, niche_specialist, senior_executive, urgent_timeline, custom. App-validated.';
COMMENT ON COLUMN jobs.client_fee_reconfirm_decision IS
    'Latest outcome: approved | rejected | withdrawn. Full history lives in notifications.';
