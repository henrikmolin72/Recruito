-- Client-facing AI screening report (client request 2026-07-11).
--
-- The report shown to the company was the internal report with every
-- percentage regex-masked to "—", which produced broken sentences and
-- collapsed tables. Instead, each evaluation run now generates a SEPARATE
-- client-friendly report with its own prompt (no scores to mask) and stores
-- it here. NULL for legacy rows / failed generation — the app falls back to
-- the masked internal report.
--
-- Service-role-only table (see 047): no GRANT needed.

ALTER TABLE public.candidate_screenings
    ADD COLUMN IF NOT EXISTS client_report_markdown text;
