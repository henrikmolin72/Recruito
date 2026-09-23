-- 000: replay-only. Restores Supabase's pre-2026-10-30 default privileges so
-- migrations 001–080 (which mostly create tables/functions without explicit
-- GRANTs) replay to the same grants prod has. Needed for `supabase db reset`,
-- preview branches and fresh projects, where new public objects no longer get
-- Data API grants automatically. Migration 081 turns this back off, so every
-- migration from 081 on must GRANT explicitly (see Dev-Notes/migration-grant-snippet.md).
--
-- Prod: NOT needed (prod already has these defaults/grants) — do not apply there.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
