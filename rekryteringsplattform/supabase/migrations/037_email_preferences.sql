-- 037 – Email notification preferences
-- Users can opt out of all notification emails (default: opted in)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN NOT NULL DEFAULT FALSE;
