# 2026-06-21 — Auth hardening, CV storage lockdown, dependency CVE upgrades

Status: Implemented (code) + **Open dashboard actions** (auth settings)
Context: Production-readiness security gate (see "Recruito — Production Readiness Breakdown" Google Doc, 2026-06-21).

## What changed (in code, this commit-set)

1. **Dependency CVEs cleared**
   - `sanitize-html` 2.17.3 → **2.17.5** (CRITICAL GHSA-rpr9-rxv7-x643 — XSS via `xmp` passthrough; backs `src/lib/sanitize.ts`, our only raw-HTML render guard).
   - `next` 16.1.6 → **16.2.9** (HIGH GHSA-ggv3-7p47-pfv8 — request smuggling; `eslint-config-next` aligned).
   - `nodemailer` 8.0.7 → **9.0.1** (HIGH GHSA-p6gq-j5cr-w38f — `raw`-option SSRF/file-read; only fixed in the 9.x major. Usage is the stable `createTransport`/`sendMail` core, no `raw` — bump verified by build).
   - `vitest` → 3.2.6 via `npm audit fix` (critical UI-server CVE, dev-only).
   - **Accepted (not fixed):** 2 moderate advisories in Next's *bundled* postcss. npm's only "fix" is downgrading Next to 9.3.3 — unacceptable. Build-time stringify XSS, low real impact. Revisit when Next ships a patched bundle.

2. **CV storage read lockdown** (migration `054_tighten_cv_storage_select.sql`)
   - The `cvs` bucket SELECT policy was `bucket_id='cvs' AND auth.uid() IS NOT NULL` — **any authenticated user could read any candidate CV** via the Storage API.
   - All CV reads now go through the **service-role (admin) client** + short-lived signed URLs, *after* app-layer authorization. The one remaining user-scoped reader (company candidate page) was switched to sign via `createAdminClient()`; authorization is already enforced upstream by `getCandidate()` (job-ownership check), so no IDOR is introduced.
   - Migration **drops** the broad SELECT policy → storage layer is now fail-closed for user-scoped clients. INSERT (upload) policy left intact.

3. **Pre-auth rate limiting** (`src/lib/actions/auth.ts`)
   - `login()` — two buckets: 10/15min per `email+IP` **and** 50/15min per `IP` (the per-IP bucket caps email-rotation credential stuffing that an email+IP key alone misses).
   - `requestPasswordReset()` — 5/15min per `email+IP` and 20/15min per `IP` (also throttles outbound email).
   - Trips if **either** bucket is exhausted. Uses the durable `consumeRateLimit()` (migration 038); IP from `x-forwarded-for` (assumes Vercel-style trusted forwarding — the header is spoofable behind an untrusted ingress). On limit, returns the same generic Swedish message Supabase's own limiter surfaces (no new i18n keys, no enumeration signal).

4. **Placement financial audit-trail** (`src/lib/actions/placements.ts` + test)
   - `sendPlacementInvoice`, `recordPlacementPayment`, `reportGuaranteeFailure` now write an `audit_log` row (`performed_by` = acting admin). TDD'd in `placements.test.ts` (red→green).
   - Inserts are **best-effort**: an audit-write failure is logged but never fails the financial mutation. `performed_by` FKs to `profiles(id)`; this invariant already holds for admins (the existing data-rights audit inserts rely on it and work in prod). The added error-logging makes any future FK gap visible rather than silent.

## Open actions — Supabase **dashboard** (launch gate)

These are **not** enforced by code. They must be set/verified in the Supabase project dashboard before launch:

- [ ] **Email confirmation ON** (`enable_confirmations`). Registration already sets `emailRedirectTo`, implying intent — confirm it's enforced.
- [ ] **Minimum password length ≥ 10.**
- [ ] **MFA decision (OWNER: Henrik).** Recommend enabling TOTP enrollment for company + recruiter accounts (Supabase supports it). Decide: required, optional-self-service, or deferred-post-launch — and record the choice here.

### Why no `supabase/config.toml` was committed
The repo manages Postgres via timestamped SQL migrations applied through the Supabase MCP/dashboard — there is **no** CLI-managed `config.toml` and no `supabase config push` step. Committing a `config.toml` with these auth settings would be inert (and misleading) unless that push step is adopted. **Decision:** keep the dashboard as the source of truth and document required values here. If we later adopt `supabase config push` for IaC-managed auth config, add a verified `config.toml` then and reference this record.

## Verification
- `npm run build` (rekryteringsplattform/) green after each change.
- `npm audit`: 0 critical / 0 high in production deps (2 moderate accepted, see above).
- Migration 054 to be applied alongside the existing 052/053 in the deploy.
