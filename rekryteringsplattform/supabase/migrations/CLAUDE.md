# Supabase migrations — focused rules (loads only when editing this dir)

## New `CREATE TABLE public.*` needs an explicit GRANT
From **2026-10-30** Supabase stops auto-exposing new `public` tables to the Data API. Add the grant now (harmless early):
- App-facing tables: `GRANT SELECT, INSERT, UPDATE, DELETE ON public.<name> TO authenticated;` (add `anon` only if truly public).
- Service-role-only tables (audit logs, admin internals): omit the grant — `createAdminClient()` still works.

## RLS — the two incidents to never repeat
- New tables holding user data: `ENABLE ROW LEVEL SECURITY` + explicit policies. Missing policies = silent exposure or 100%-broken reads (messaging was 0-messages-ever until fixed).
- **No recursive policies** (a policy that queries its own table) — caused a login OUTAGE (migration 056 → fixed by 057 with a `SECURITY DEFINER` helper).

## Hygiene
- One concern per migration, numbered sequentially. **Never edit an already-applied migration** — add a new one.

See `Dev-Notes/migration-grant-snippet.md` and root `CLAUDE.md` §6.
