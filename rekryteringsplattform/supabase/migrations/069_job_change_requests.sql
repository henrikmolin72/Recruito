-- Admin "request changes" review loop on jobs (pending_approval -> draft -> resubmit).
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS changes_requested_note TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS changes_requested_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS resubmitted_at TIMESTAMPTZ;
