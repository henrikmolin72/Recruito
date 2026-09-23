-- 081: ends the replay-only defaults from 000. From here on, every new public
-- table, sequence and function needs an explicit GRANT in its own migration
-- (Supabase stops auto-granting on 2026-10-30). Snippet: Dev-Notes/migration-grant-snippet.md.
--
-- Prod: optional but recommended — makes prod behave like local/branches now
-- instead of on 2026-10-30. Existing objects keep their grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, service_role;
