# Move `000_cleanup.sql` out of `supabase/migrations/`

**Date:** 2026-05-23
**Status:** Accepted
**Affects:** `rekryteringsplattform/supabase/`

## Context

`supabase/migrations/000_cleanup.sql` was a destructive `DROP TABLE … CASCADE` script for every Recruito application table. Its purpose was to give a fresh local Supabase instance a clean slate before re-applying the rest of the migrations. The comment at the top — "Kör denna FÖRST för att rensa ALLT" — was a leftover from initial schema bootstrapping.

Because it lived under `supabase/migrations/`, it was indistinguishable from real schema migrations to the Supabase CLI. `supabase db push` and `supabase db reset` would happily pick it up and run it against whatever target the CLI was pointed at.

Between **2026-04-28** (last real activity in storage) and **2026-05-02** (when `73cac24 fix(e2e): add CI concurrency, prod-URL guard, deterministic user lookup` added an explicit guard against running E2E setup against production), production was investigated as a candidate for having been wiped via this path. While the eventual root cause turned out to be unrelated (the `.env.local` was pointing at a different Supabase project than we initially queried), the existence of `000_cleanup.sql` in `migrations/` is itself a footgun and would have caused real damage given enough time.

## Decision

1. Move the file from `supabase/migrations/000_cleanup.sql` to `supabase/scripts/dev-reset.sql`.
2. Replace the misleading "run this first" comment with an explicit "DEV-ONLY DESTRUCTIVE RESET" header that documents:
   - Why it's not in `migrations/` and must not be moved back.
   - How to invoke it intentionally against a local DB.
   - That `auth.users` and `storage.objects` are out of scope (they live in Supabase-managed schemas, not `public`).
3. No CI gate was added in this PR. A pre-deploy check that blocks `DROP`/`TRUNCATE` migrations against the production project ref is a reasonable follow-up but lives outside this change.

## Consequences

- `supabase db push` / `supabase db reset` against any target will no longer touch the file.
- Anyone running `supabase migration up` against a fresh local DB now needs to manually `psql -f supabase/scripts/dev-reset.sql` first — no functional regression for prod, mild extra step for fresh-local-DB bootstrap (which is rare).
- Migration numbering starts at `001_initial_schema.sql`; no renumbering needed since `000_cleanup.sql` never owned a real schema version.

## Related

- Incident investigation: 2026-05-23 conversation establishing `.env.local` pointed at an empty Supabase project (`zzskjstnozqqpevkvswc`) while real data lived in `eu-west-1 MICRO` (also `zzskjstnozqqpevkvswc` — confusion came from a sibling empty NANO project `jaiaifijpcnccvpxzdos` named "Recruito" that has since been deleted).
- Guardrail commit: `73cac24` — refuses to run E2E setup against production without an explicit env opt-in.
