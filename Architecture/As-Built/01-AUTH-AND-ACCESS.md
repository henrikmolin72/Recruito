# Auth & Access Control (RLS) — As-Built (2026-06-29, migrations through 061)
> Current-state companion to the original build spec [[Architecture/03-AUTH-SYSTEM]]. The spec is the frozen April plan; this note is what the code actually does now.

## What it does today
- **Two trust layers.** Edge `middleware.ts` does route gating (auth + role) on every request; Postgres RLS does row-level data scoping. Server actions add an explicit app-layer authz check (`requireAdmin()`, ownership checks) on top of RLS.
- **Role source of truth is `app_metadata.role`.** `requireAdmin()` (`src/lib/actions/require-admin.ts`) trusts *only* `user.app_metadata.role === "admin"`. `user_metadata` is client-writable via `supabase.auth.updateUser()`, so it is never trusted for admin. In `login()` (`auth.ts`), admin is gated on `app_metadata` only; `user_metadata.role` is accepted as a fallback for the non-privileged `company`/`recruiter` roles (set at signup), and the final redirect role is whitelisted to `admin|company|recruiter` to block path injection.
- **Three roles:** `admin`, `company`, `recruiter`. There is no end-user "candidate" login — candidates are data rows, not auth users.
- **Login gates on approval status.** `login()` signs the user out and returns a generic message if a recruiter is `pending`/`suspended`/`blocked`/`rejected`, or a company is `pending`/`suspended`/`rejected`. Recruiter with no row → signed out.
- **Registration uses the service-role (admin) client to create the profile row**, then deletes the auth user if the profile insert fails (compensating rollback). Company → `approval_status='pending'`; recruiter → email to internal + confirmation email to applicant.
- **Error hygiene:** raw Supabase/Postgres errors are never returned to the client (`mapAuthError`) and never logged whole (`logSafeError` logs only `code`/`status`/`message`) — they can carry submitted PII/schema.
- **Rate limiting:** `login` 10/15min per email+IP + 50/15min per IP; `requestPasswordReset` 5/15min per email+IP + 20/15min per IP. Two-bucket design catches email-rotation credential stuffing; fails open if the backing store is down.
- **RLS enforcement model:** user-scoped clients (anon key, via `server.ts`/`client.ts`/`middleware.ts`) are subject to RLS. The service-role client (`admin.ts`) **bypasses RLS entirely** and is the deliberate path for privileged writes (placements, notifications, activity_log, AI screenings) and for signed-URL CV reads after app-layer authz.

## Key files
- `src/lib/actions/auth.ts` — `login`/`registerCompany`/`registerRecruiter`/`logout`/`requestPasswordReset`; role resolution, approval gating, rate limit, safe error mapping.
- `src/lib/actions/require-admin.ts` — `requireAdmin()`; `app_metadata.role === "admin"` only, else `redirect("/login")`.
- `src/lib/supabase/server.ts` — server-side anon client (cookie-bound, RLS-scoped).
- `src/lib/supabase/client.ts` — browser anon client (RLS-scoped).
- `src/lib/supabase/admin.ts` — `server-only` service-role client; **bypasses RLS**.
- `src/lib/supabase/middleware.ts` — `updateSession()`: refreshes session, redirects unauth users off `/company|/recruiter|/admin`, enforces role-to-path routing, redirects logged-in users off `/login|/register`, auto-detects locale.
- `middleware.ts` (app root) — "Coming Soon" gate (`PREVIEW_TOKEN` cookie bypass) wrapping `updateSession()`; `matcher` excludes static assets.

## Data model / migrations
**RLS-protected tables** (enabled in `002`): `profiles`, `companies`, `recruiters`, `jobs`, `job_mandates`, `candidates`, `placements`, `conversations`, `conversation_participants`, `messages`, `notifications`, `activity_log`. Plus `ai_screenings` (`014`) and `storage.objects` cvs bucket.

**SECURITY DEFINER helpers** (the access primitives every policy is built on; `STABLE`, `SET search_path=''`):
- `is_admin()`, `auth_role()`, `get_company_id()`, `get_recruiter_id()` — defined `002`, hardened with fixed `search_path` in `016`/`021`.
- `recruiter_holds_job_mandate(job_id)` — `057`.
- `company_owns_job(job_id)` — `058`.

Migration history shaping this area:
- **002** — enables RLS on all core tables; defines helpers + every base policy. `is_admin()` resolves admin via the `profiles.role` column (DB-side), distinct from the app-layer `app_metadata.role` check.
- **004 → 007** — `004` loosened mandate-claim to any recruiter (dev); `007` restored "approved recruiters only" + moved `notifications`/`activity_log` INSERT to `service_role`-only.
- **014** — `ai_screenings` writes locked to `is_admin()` (service role bypasses anyway); dropped permissive `TRUE` write policies.
- **015** — enables RLS on `jobs`; renames `recruiter_mandates` → `job_mandates`.
- **016 / 021** — Supabase linter fixes: all helpers recreated with `SET search_path=''`; `auth.*()` wrapped in `(SELECT …)` for per-query (not per-row) eval; `pg_trgm` moved to `extensions` schema; permissive INSERTs → `service_role`-only. `021` is the consolidated baseline for the per-table policies.
- **040** — recruiter KYC: `recruiters.kyc_checklist` (JSONB) + `kyc_rejection_reason`; backs the manual admin approval flow that `login()` gates on.
- **054 / 059** — CV storage lockdown: drop the broad "any authenticated user can read any CV" SELECT policy on `storage.objects` (cvs bucket). CVs now served only via service-role signed URLs after app-layer ownership checks. INSERT (recruiter upload) policy intentionally retained.
- **056** — recruiter who holds/held a mandate keeps SELECT on that job for its whole lifecycle (fixes "Okänt jobb" once a job leaves `active`). Did so with a **raw** `job_mandates` subquery in the jobs SELECT policy.
- **057** — **RLS-recursion outage fix.** The `056` raw subquery made `jobs → job_mandates → jobs` mutually recursive under RLS (Postgres `42P17`), 500-ing company + recruiter dashboards (admin used service role, unaffected). Fix: route the mandate check through SECURITY DEFINER `recruiter_holds_job_mandate()`, whose internal read bypasses RLS and breaks the cycle. Same access, no new data exposed.
- **058** — defense-in-depth: the three remaining raw `…IN (SELECT id FROM jobs WHERE company_id = get_company_id())` subqueries (`job_mandates` SELECT, `candidates` SELECT/UPDATE) moved into SECURITY DEFINER `company_owns_job()`. After this, **no raw cross-table policy subqueries remain**, so the recursion class cannot be reintroduced by editing a single policy.

**Policy shape (current):**
- `companies` SELECT is `TRUE` (public); INSERT/UPDATE owner-or-admin.
- `recruiters` SELECT = approved OR self OR admin.
- `jobs` SELECT = `active` OR own-company OR admin OR `recruiter_holds_job_mandate(id)`.
- `candidates`/`job_mandates` scoped via `get_recruiter_id()` / `company_owns_job()` / `is_admin()`.
- `placements` admin-only writes; visible to involved company/recruiter/admin.
- `notifications`/`activity_log`/`ai_screenings` writes are service-role/admin only.

## Notable changes since the original plan
- **Admin trust moved to `app_metadata`.** The app-layer admin gate (`requireAdmin`, `login`) trusts `app_metadata.role`, not `user_metadata` (anti self-promotion). Note the DB-side `is_admin()` still keys off `profiles.role` — two parallel admin signals, app-layer is the stricter one.
- **Recursion-safe RLS via SECURITY DEFINER.** Cross-table checks are now functions, not inline subqueries (`057`/`058`) — a direct response to the 2026-06-23 outage.
- **CV storage is fail-closed.** Direct Storage-API reads of CVs by user-scoped clients were removed (`054`/`059`); all CV reads go through service-role signed URLs gated by app-layer authz.
- **Approval gating at login.** Recruiter KYC (`040`) and company `pending` states actively block sign-in beyond what the original spec described.
- **Rate limiting + safe error mapping** added to all auth entry points (not in the April spec).
- **Service-role for messaging.** Conversation creation routes through the service-role client to escape an RLS chicken-and-egg (see ADR below) — relevant to [[Architecture/07-MESSAGING]].
- **Coming-Soon gate** wraps the whole app at the edge (`middleware.ts`), independent of auth.

## Related decisions & notes
- [[Decisions/2026-06-21-auth-hardening-and-cv-storage-lockdown]] — auth hardening + CV storage lockdown (054/059) + CVE upgrades; has open dashboard actions.
- [[Decisions/2026-06-22-recruiter-mandate-job-read-rls]] — mandate-holder job read access (migration 056).
- [[Decisions/2026-06-23-rls-recursion-jobs-policy-outage]] — the 42P17 recursion outage and the 057 fix; 058 is the follow-up.
- [[Decisions/2026-06-22-messaging-rls-service-role-creation]] — conversations created via service role to break messaging RLS chicken-and-egg.
- [[Decisions/2026-05-27-supabase-public-grant-default]] — new `public.*` tables need explicit `GRANT` (Oct 30 2026 Data-API cliff).
- [[Dev-Notes/supabase-auth-config-production-sync]] — auth settings that live in the Supabase dashboard, not migrations.
- [[Dev-Notes/migration-grant-snippet]] — the grant snippet for new app-facing tables.
