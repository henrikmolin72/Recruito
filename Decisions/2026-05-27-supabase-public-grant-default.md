# Supabase public-schema GRANT default change

**Date:** 2026-05-27
**Status:** Active

## Context

Supabase is changing the default behavior of the `public` schema:

- **May 30, 2026** — new projects: tables in `public` are no longer auto-exposed to the Data API (PostgREST / GraphQL / `supabase-js`). Explicit `GRANT` required.
- **October 30, 2026** — existing projects (including Recruito): same enforcement applies to *new* tables created after this date. Existing tables keep working.

Source: Supabase changelog (email received 2026-05-27).

## Impact on Recruito

- **Today → Oct 30, 2026:** zero impact. All current tables (40+ migrations through `040_recruiter_kyc.sql`) stay reachable.
- **After Oct 30, 2026:** any new `CREATE TABLE public.*` migration that omits an explicit `GRANT` will produce a table the app cannot read or write. Failures will look like `permission denied for table foo` from `supabase-js`.

RLS is unaffected — RLS policies still apply on top of grants. The grant is the *prerequisite* for the API to even consider exposing the table.

## Decision

Add explicit grants to every new `CREATE TABLE public.*` migration from now on, regardless of date. Including them before Oct 30 is harmless (current behavior already grants), and avoids a flag-day cliff.

See [Dev-Notes/migration-grant-snippet.md](../Dev-Notes/migration-grant-snippet.md) for the snippet.

Project `CLAUDE.md` §6 has the operational reminder.

## Audit step before Oct 30

Run **Security Advisor** in the Supabase dashboard. It surfaces tables currently exposed to the Data API. Confirm everything listed is intended to be reachable from the app — anything that should be admin-only / service-role-only can be locked down before the enforcement date.

## Update 2026-09-23 — replay fix (migrations 000 + 081)

Supabase's Oct-30 notice also covers `supabase db reset`, preview branches and new projects. 29 of our 32 tables (and most functions) are created without explicit grants, so a fresh replay would leave the app with `permission denied` everywhere (verified: service_role `GET /rest/v1/jobs` → 403).

**Chose:** `000_legacy_default_privileges.sql` (re-enable old defaults for replay) + `081_end_legacy_default_privileges.sql` (turn them off). Replay grants are byte-identical to a pre-Oct-30 replay, and later REVOKEs (078 companies PII) still land in order.
**Rejected:** backfilling GRANTs on all 29 tables — would silently re-grant what 078 revoked and needs per-table judgement.
**Also corrected:** service_role does NOT bypass grants (see 080); snippet + CLAUDE.md said otherwise.
