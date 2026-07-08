# Local Supabase stack — bootstrap gotchas (found 2026-07-08)

Discovered while e2e-verifying the guarantee-period workflow on a fresh local stack (`npx supabase start` in `rekryteringsplattform/`).

## 1. Fresh-DB migration chain is broken (order bug)

`023_create_applications_table_and_fixes.sql` creates `applications` and `ai_screenings` — but two EARLIER migrations already reference them, so a fresh database fails during `supabase start`:

- `014_harden_ai_screenings_write_policies.sql` → `DROP POLICY … ON public.ai_screenings` → `42P01`
- `022_referral_link_enhancements.sql` → `ALTER TABLE applications …` → `42P01`

Prod is unaffected (tables pre-existed there; 023 backfilled the repo).

**FIXED 2026-07-08:** 014 and 022 are now wrapped in `DO $$ … to_regclass(...)` guards that no-op when their target table doesn't exist yet — 023 creates both tables with 022's columns and equivalent admin-only policies, so a fresh DB ends up prod-equivalent. Verified: full `supabase db reset` applies 001→064 cleanly, and re-running 014/022 against a populated DB (prod scenario) is a no-op. No renaming needed anymore.

Known cosmetic divergence: prod's `applications.screening_answers` default is `'[]'` (022 ran there before the table was in 023), fresh DBs get `'{}'` (023's definition). App code treats it as opaque JSON; noted in case it ever matters.

## 2. `config.toml` key removed in newer CLI

`secure_email_change_enabled` under `[auth.email]` is rejected by supabase CLI ≥2.x. Removed 2026-07-08 (semantics covered by `double_confirm_changes`).

## 3. Fresh DB lacks Data-API grants for service_role

REST calls with the service key fail with `permission denied for table …` until:

```sql
GRANT USAGE ON SCHEMA public TO service_role, authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role, authenticated;
```

(Consistent with the Oct 2026 Supabase grant-default change — see `Decisions/2026-05-27-supabase-public-grant-default.md`.)

## 4. PostgREST embed ambiguity: placements ↔ candidates

Since `018` added `candidates.placement_id`, there are TWO FK paths between `placements` and `candidates`. Current PostgREST rejects the plain embed `candidate:candidates(...)` from `placements` with `PGRST201` — every such server action **silently no-ops** (`.single()` → error → "Placering hittades inte"). Prod may tolerate it only until its PostgREST is upgraded.

**Rule:** embeds from `placements` (including nested via `placement:placements(...)`) must use the hint
`candidate:candidates!placements_candidate_id_fkey(...)`. Fixed 2026-07-08 in `placements.ts`, `api/guarantee/{reminders,breach}`, `admin/guarantees/page.tsx`.

## Local e2e recipe (as used)

1. Reorder 014/022 (above) → `npx supabase start`
2. Apply the grants (above) via `docker exec supabase_db_rekryteringsplattform psql -U postgres`
3. Seed users/placements: session scratchpad `seed-local.mjs` pattern — `auth.admin.createUser` (with `app_metadata.role`) + rows for recruiter/company/job/mandate/candidate/placement
4. Point dev at local: `.env.development.local` with the local URL/keys (Next dev prefers it over `.env.local`) — **delete afterwards**
