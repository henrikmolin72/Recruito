# Shared Components, i18n, Landing & Compliance — As-Built (2026-06-29, migrations through 061)
> Current-state companion to the original build spec [[Architecture/11-SHARED-COMPONENTS]]. The spec is the frozen April plan; this note is what the code actually does now.

## What it does today

**i18n** — Cookie-based locale, four locales `sv/en/da/no`, default `sv` (`src/i18n/config.ts`). No URL prefix; the `NEXT_LOCALE` cookie (1-year, `SameSite=lax`) is read server-side in the root layout. `setLocale` is a server action that writes the cookie and the client calls `router.refresh()`. Dictionaries are 19 namespaces, full key parity across all four files (~1,700 keys each — 1,711 flattened per locale). Two translator surfaces:
- Server: `getTranslations(ns)` / `getDictionary()` / `createTranslator()` — the server `t` supports `{param}` interpolation.
- Client: `useTranslations()` / `useLocale()` from a `LocaleProvider` context — the client `t` does **not** interpolate (callers do `t(key).replace("{x}", v)`).

Both resolve dotted keys against the dictionary and **fall back to returning the key string** when missing — so a missing key renders as the raw key, not a build error. Key parity is maintained by convention/review, **not** enforced by a build script (no parity checker found in `scripts/` or `package.json`).

**Cookie consent** — Two-layer: `src/lib/cookie-consent.ts` (state, stored in a versioned JSON cookie `recruito_consent`, categories `necessary`+`analytics`, `CONSENT_VERSION=1`, dispatches a `recruito:consent-updated` event) and `src/components/cookie-consent.tsx` (the banner UI: Accept all / Reject non-essential / Customize, mounted globally in the root layout). Banner renders only after mount so SSR HTML is consent-agnostic.

**Landing page** (`src/app/page.tsx`) — Client component, fully i18n'd via `useTranslations()`. Nav, hero (with image), how-it-works, company/recruiter benefits, a demo+CTA block, and footer with legal links. The original pricing **calculator was replaced** by a demo block: an optional YouTube embed gated on `NEXT_PUBLIC_LANDING_DEMO_YOUTUBE_URL`, with a `getYouTubeEmbedUrl()` parser (handles `youtu.be`, `/watch`, `/embed/`, `/shorts/`); when the env var is unset it shows a dev-only English placeholder.

**Legal routes** — `/anvandarvillkor` (Terms, English, static), `/integritetspolicy` (Privacy) and `/gdpr` (GDPR rights), the latter two server components reading `getLocale()`. Privacy/GDPR long-form prose lives **in the component, not in dictionaries** — Swedish canonical, English full translation, NO/DA fall back to Swedish with a header note. Both carry a `DraftBanner` ("Version 1 — under external legal review"). Per the June 23 decision these legal pages are deliberately exempt from the i18n sweep.

**Data rights (GDPR Art. 17/20)** — `src/lib/actions/data-rights.ts`:
- `exportMyData()` (user, single-step): admin client gathers every row referencing `user.id` across profiles/recruiters/companies/notifications/conversations/candidates/placements/jobs and returns a JSON blob. Notes 7-year accounting retention (Bokföringslagen §7).
- `requestAccountErasure(reason)` (user): inserts a `pending` row into `data_rights_requests`, blocks duplicates, audit-logs the request.
- `getPendingDataRightsRequests()` / `markDataRightsRequestComplete()` / `anonymizeCandidate()` (admin, all `requireAdmin()`): admin queue + the actual pseudonymization via the `anonymize_candidate` RPC (also best-effort deletes the CV from the `cvs` storage bucket first). Admin UI at `/admin/data-rights`.

**Rate limiting** — `src/lib/security/rate-limit.ts` calls the `consume_rate_limit` RPC (durable Postgres store, replacing the old in-memory bucket that didn't survive Vercel isolates). Used by auth, applications, candidates-extended, and the `/api/screen|screening-report|generate-shortlist|check-duplicate|health` routes.

**Compliance UI** — `src/components/compliance/ai-policy-content.tsx` (AI Screening transparency page, "in compliance with the EU AI Act", role-parameterized company/recruiter — note: this content is hardcoded English, not dictionary-driven) and `bias-report-card.tsx`.

**Compliance export routes** — Two EU AI Act traceability endpoints (`runtime = "nodejs"`), both auth-gated via `supabase.auth.getUser()` + a `profiles.role` check through the admin client:
- `GET /api/compliance/audit-export` (`audit-export/route.ts`) — **admin-only** (`role !== "admin"` → 403). Queries `ai_audit_log` (joined to `jobs.title` and `applications.full_name`), filterable by `jobId`/`from`/`to`, capped at 5000 rows, and streams a **CSV** download via `csvEscapeCell` (formula-injection-safe). 404 when no records.
- `GET /api/compliance/bias-report` (`bias-report/route.ts`) — requires `jobId`; access is **admin or the owning company** (job → `companies.user_id` match, else 403). Returns the latest `ai_bias_reports` row for the job as **JSON** (404 → `{ report: null }`).

## Key files

- `src/i18n/config.ts` — locales, default, cookie name, labels.
- `src/i18n/server.ts` — `getLocale`/`getTranslations`/`getDictionary`/`createTranslator` (param-aware).
- `src/i18n/client.tsx` — `LocaleProvider`, `useTranslations`, `useLocale` (no interpolation).
- `src/i18n/actions.ts` — `setLocale` server action (cookie write).
- `src/i18n/dictionaries/{sv,en,da,no}.json` — 19 namespaces, ~90 KB each, parity by convention.
- `src/app/layout.tsx` — wires `getLocale`+`getDictionary` → `<html lang>`, `LocaleProvider`, mounts `CookieConsentBanner`.
- `src/components/layout/language-switcher.tsx` — `buttons`/`dropdown` variants; mount-gated to avoid hydration mismatch.
- `src/lib/cookie-consent.ts` + `src/components/cookie-consent.tsx` — consent state + banner.
- `src/app/page.tsx` — landing page (calculator replaced by demo block).
- `src/app/{anvandarvillkor,integritetspolicy,gdpr}/page.tsx` — legal routes.
- `src/lib/actions/data-rights.ts` — DSR export/erasure/anonymize.
- `src/lib/security/rate-limit.ts` — wraps `consume_rate_limit` RPC.
- `src/components/compliance/{ai-policy-content,bias-report-card}.tsx` — AI Act transparency + bias card.
- `src/components/shared/`, `src/components/ui/` — shared primitives (badges, buttons, cards, empty-state, candidate-chat, status-badge, etc.).

## Data model / migrations

- **027** `027_ai_compliance.sql` — EU AI Act trail backing the compliance export routes above. Extends `ai_screenings` with audit columns (`model_version`, `prompt_hash`, `decision_context`, `human_reviewer_id/at`, `is_decision_support`), creates `ai_audit_log` (full per-action regulatory trail: `action`, `actor_id/role`, `model`/`model_version`/`prompt_hash`, non-PII `input_summary`/`output_summary` JSONB; indexed on `job_id`/`application_id`/`created_at`) and `ai_bias_reports` (per-job aggregated demographic distributions — experience/location/score — plus `flags`, `UNIQUE(job_id, report_date)`). Both RLS-on: admins see all, recruiters see own audit rows (`actor_id = auth.uid()`), companies see rows for their own jobs; writes are service-role only.
- **038** `038_rate_limits.sql` — `rate_limits` table (RLS on, no policies = service-role only) + `consume_rate_limit(key, limit, window_ms)` atomic SECURITY DEFINER upsert; `EXECUTE` granted to `service_role` only.
- **039** `039_data_rights.sql` — `audit_log` (append-only, service-role-only, RLS no-policy), `data_rights_requests` (enums `data_rights_request_type` = erasure/export, `data_rights_request_status` = pending/in_progress/completed/rejected; RLS lets a user `SELECT` own rows via `requested_by`/`subject_user_id`; admin reads via service-role), and `anonymize_candidate(candidate_id, admin_id, reason)` — nulls all PII columns, keeps the row + FKs for placement/accounting integrity, deletes the candidate's conversation messages, writes an `audit_log` entry; `EXECUTE` to `service_role` only.
- **048** `048_company_profile_notice_accepted.sql` — adds `companies.candidate_profile_notice_accepted boolean` (one-time per-company popup ack; ALTER on existing table, no new GRANT). See [[Architecture/As-Built/02-COMPANY-PORTAL]] for the consuming flow.

Consent state itself is **client-only** (cookie/JSON), no table.

## Notable changes since the original plan

- **i18n went from 1 → 4 locales** and got a full dashboard sweep (June 22): ~25 components had hardcoded Swedish; ~290 keys added at full parity. Legal pages explicitly excluded.
- **Landing calculator removed**, replaced by an env-gated YouTube demo block + image cards.
- **GDPR/data-rights infra added** (migration 039) — not in the April shared-components spec; export is self-serve, erasure is a two-step admin-reviewed queue with audit logging and a candidate-anonymization RPC that respects 7-year accounting retention.
- **Rate limiting moved from in-memory to Postgres** (migration 038) for Vercel isolate correctness.
- **Cookie consent banner added** (versioned cookie, analytics category) — globally mounted in the root layout.
- Key-parity is **review-enforced, not build-enforced**; missing keys degrade to the raw key string at runtime rather than failing the build (note: project CLAUDE.md §6 asserts the build fails on missing i18n keys — that guarantee is about *referenced-but-absent dictionary files/imports*, not per-key parity, which this code does not check).

## Related decisions & notes

- [[Decisions/2026-06-22-i18n-dashboard-sweep]] — the 4-locale dashboard sweep; client-`t` no-interpolation rule; legal pages left in Swedish; `npm run build | tail` exit-code gotcha.
- [[Decisions/2026-06-21-auth-hardening-and-cv-storage-lockdown]] — auth/CV-storage hardening (context for the data-rights CV deletion + rate-limit usage).
- [[Decisions/2026-05-27-supabase-public-grant-default]] — new-table GRANT default (why 038/039 service-role tables omit grants).
- [[Dev-Notes/migration-grant-snippet]] — the GRANT snippet referenced by the grant-default decision.
- [[Dev-Notes/deployment-runbook]] — deployment steps (mentions cookie/consent/locale config).
- Cross-area: [[Architecture/As-Built/02-COMPANY-PORTAL]] (candidate-profile-notice flow, migration 048), [[Architecture/As-Built/06-SCREENING-AI]] (AI-policy/bias compliance surfaces).
