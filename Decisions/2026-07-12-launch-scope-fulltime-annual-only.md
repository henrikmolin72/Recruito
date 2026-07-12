---
date: 2026-07-12
status: accepted
tags: [launch, scope, fee-calculator, jobs, employment-type, admin-workflow]
---

# Launch scope: Full-time + Annual-salary jobs only; admin request-changes loop; confidential masking

## Context

Client review before launch surfaced two written findings and a set of screenshot-annotated issues (folder `Fixes in recruito/calculator fee`, images `12-07-01`…`12-07-16`). The unifying theme: the recruitment-fee calculator is only correct for annual-salary full-time roles, and several job-workflow surfaces had display/UX defects. Shipped on branch `fix/client-launch-fixes` (12 commits, base `fe13ab3`).

## Decisions

### 1. Employment type restricted to Full-time for launch
The fee formula (`calculateClientFee` in `src/lib/utils.ts`) multiplies the calculator value as an **annual** salary. Part-time/Contract/Freelance/Internship need hourly/daily pricing models that don't exist yet, so offering them produced wrong fees.

- New constant `ACTIVE_EMPLOYMENT_TYPE_OPTIONS = ["full_time"]` in `src/lib/job-form-options.ts`. The full `EMPLOYMENT_TYPE_OPTIONS` (6 types) is **kept intact** so legacy jobs still render their labels.
- Wizard select maps the active list; the formData init coerces a legacy stored type back to `full_time`.
- Server enforces it: `createJobSchema.employment_type` has a `.refine()` rejecting anything not in the active list (message key `validation.employmentTypeUnavailable`).
- **To re-enable other types later:** add them back to `ACTIVE_EMPLOYMENT_TYPE_OPTIONS`, restore the Step-4 salary-period `<select>` (see #2), and — critically — first implement per-type pricing (hourly/daily → normalized annual, or a distinct fee model) so `calculateClientFee` stays correct.

### 2. Salary period fixed to Annual
The Step-4 period `<select>` (Monthly/Annual/Hourly) was replaced with a static "Annual" chip; `buildFormData` always sends `salary_period: "yearly"`. The zod enum still accepts all three so legacy rows validate. The wizard's hand-rolled fee memo (which had a divergent hardcoded `3500` floor) now calls the canonical `calculateClientFee` — one source of truth for the fee shown vs. the fee locked server-side.

### 3. Admin "Request changes" reuses the `draft` status (no new enum value)
Client wanted a job sent back for edits to "return to Draft". `requestJobChanges` (admin action) flips `pending_approval → draft` with a `changes_requested_note`, notifies the company, and shows a banner on the edit page. On re-publish, `createJob` stamps `resubmitted_at` and notifies admins; the admin list shows a "Resubmitted" chip. Migration **069** adds `changes_requested_note`, `changes_requested_at`, `resubmitted_at` to `jobs` (existing table — no GRANT needed).
- A job sent back to draft correctly **disappears** from the admin list (which filters `.neq("status","draft")` per decision #5) and reappears as `pending_approval` on resubmit — coherent, no job stuck invisible.
- `requestJobChanges` uses the RLS-scoped `requireAdmin()` client (not service-role). Verified safe: `companies` SELECT is world-readable (`USING (TRUE)`, migration 002, never narrowed), so the `company:companies(user_id)` embed resolves the notify target; the jobs UPDATE passes via `is_admin()`, identical to the proven `approveJob`.

### 4. Confidential company masking is a DATA-layer guarantee, scoped to pre-claim
`is_confidential` now masks the company name to `null` in the recruiter marketplace **at the server action** (`getAvailableJobsForRecruiter`), and the raw `company` join + `company_id` are **destructured out** of the returned object so they never enter the RSC flight payload of the `RecruiterJobsList` client component (the original fix nulled a derived field but still shipped the raw join — a real view-source leak, caught in security review). The website chip is hidden when confidential; the never-rendered `logo_url` was dropped from the recruiter-detail select.
- **Scope boundary (intentional):** "confidential" applies to **pre-claim marketplace browsing**. After a recruiter takes the mandate, downstream pages (mandates, candidates, earnings, inbox) show the real company name — the recruiter needs it to do the work. This matches standard confidential-search behavior. Not a leak; documented here so a future reviewer doesn't re-derive it from behavior.

### 5. Smaller display/i18n fixes
- `status.pending_approval` / `pending_client_reconfirm` were missing from all 4 dicts → raw key rendered in the admin table. Added.
- Admin jobs list now filters `.neq("status","draft")` (drafts are not published listings).
- Guarantee `0` renders "0 months" (was "—" or hidden) across 5 sites; `null` still renders "—".
- Company job-detail Description tab no longer duplicates the page-header title/company/location block (`hideHeading` prop on `JobPreviewCard`).
- Contact Support is now an in-app modal form (auto-includes sender + job context) emailing `SUPPORT_EMAIL` (falls back to `INTERNAL_REVIEW_EMAIL`) via the existing Resend/SMTP `dispatch`, replacing the bare `mailto:`.
- Job wizard gives field-level validation feedback: Next validates the current step, Publish validates all required steps and jumps to the first offending field; the server now returns which `field` failed so a server-side rejection also highlights + jumps.

## Consequences

- Existing non-full-time demo/seed jobs are left untouched; the recruiter marketplace employment-type filter derives its options from live jobs and self-heals as they close (no data migration).
- Migration 069 must be applied to production as a release step (agent has no prod DB access). Validated against the local Postgres stack.
- `SUPPORT_EMAIL` should be set in production env; without it (and without `INTERNAL_REVIEW_EMAIL`) the support form fails closed with a generic error.

## Verification

Full automated gate green on the integrated branch: `npm run build` (compiles), `npm run lint` (0 errors), `npm run test` (313/313, incl. new TDD tests for the employment restriction, validation field-mapping, support action, and request-changes action). Every task got an independent spec+quality review; the confidential change got a dedicated security review (which caught the RSC-payload leak) and the request-changes change got an RLS trace. Migration 069 applied + column-verified on the local stack; app boots on local, login as a local user succeeds, wizard renders and blocks Next on empty required fields.
