-- Mandate expiry notification dedupe.
-- The expiry cron (/api/cron/mandate-expiry) stamps this when it sends the
-- one-time "mandate expired" heads-up, so a later run skips the mandate. This
-- makes the cron idempotent and resilient to missed daily runs (fire on the
-- first run at/after the 10-day boundary, exactly once).
-- ALTER on an existing table — existing GRANTs apply, no new GRANT needed.

ALTER TABLE public.job_mandates
  ADD COLUMN IF NOT EXISTS mandate_expiry_notified_at TIMESTAMPTZ;
