-- candidates.company_stage + company_viewed_at existed only in prod (added ad
-- hoc, never captured in a migration — found during the 2026-06-29 vault sync,
-- confirmed blocking fresh-DB stage moves during 2026-07-08 local e2e: every
-- company stage transition 500s without them, so no stage history is written).
-- IF NOT EXISTS: no-op on prod, creates the columns on fresh databases.

ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS company_stage text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS company_viewed_at timestamptz;
