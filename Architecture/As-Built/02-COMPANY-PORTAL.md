# Company Portal — As-Built (2026-06-29, migrations through 061)
> Current-state companion to the original build spec [[Architecture/04-COMPANY-PORTAL]]. The spec is the frozen April plan; this note is what the code actually does now.

## What it does today
- A company (client) logs in and lands in the `(dashboard)/company` segment. The segment layout reads `companies.approval_status` and blocks the dashboard with a "pending approval" screen unless the row is missing or `approved` (`src/app/(dashboard)/company/layout.tsx`; migration 051).
- **Jobs**: list + create + detail. The job detail page has five tabs — Pipeline, Description, Recruiters, Announcements, AI Compliance (`jobs/[id]/page.tsx`). Paused jobs block new referrals (see [[Architecture/As-Built/03-RECRUITER-PORTAL]] if present; gate lives recruiter-side).
- **Candidate visibility is gated by `recruito_screened_at`**: companies only ever see candidates Recruito has approved. Every company-facing candidate query filters `.not("recruito_screened_at", "is", null)`, and the detail page returns `notFound()` if the candidate isn't screened. Rejected candidates never get the timestamp set, so they stay invisible (migrations 030, 044).
- **Candidate funnel (two surfaces, different column models)**:
  - The global `/company/candidates` page renders `CandidatePipeline`, a 9-column kanban (Presented, Under review, Interview, Final interview, Offer, Hired, Paused, Rejected, Withdrawn). Columns are computed in `getColumnKey()` by normalizing the candidate `status` through `normalizeCandidateStatusForWorkflow`. Cards are read-only; clicking a name routes to the detail page. A list-view toggle shows the same data flat.
  - The per-job Pipeline tab renders `CompanyCandidatesOverview` instead — three stat cards (total / active processes / unique recruiters) plus a sorted flat list (done candidates sink to the bottom). Not a kanban.
- **Candidate detail view** (`jobs/[id]/candidates/[candidateId]/page.tsx`): reuses the shared `CandidateDetailSections` (same rich read-only view the recruiter portal uses) + contact card, read-only skill tags, CV download, AI match score, stage-history timeline, and the interactive `CandidatePresentStatusPanel`. Messaging is the split `TabbedCandidateChat` (a `client` thread with the recruiter + a `recruito_company` thread with Recruito — see [[Decisions/2026-06-24-split-recruito-threads]]).
- **Access-confirmation notice**: the first time a company opens *any* candidate, `CandidateAccessGate` intercepts the click with a one-time modal ("viewing notifies the recruiter… aim to decide within 45 days"). Accepting calls `acceptCandidateProfileNotice()`, which flips `companies.candidate_profile_notice_accepted=true` (company-level, once forever), then navigates. After that the gate renders a plain `<Link>` (migration 048).
- **Opening = the view event**: `CandidatePresentStatusPanel` auto-fires `updateCompanyStage(..., "viewed")` on first mount (guarded by a ref + "no current stage"), which notifies the recruiter and starts a **45-day hiring-timeline** countdown badge (was a 5-day response window earlier — now superseded).
- **Stage progression** (company-driven): the panel exposes Viewed → Interview → Final Stage Interview → Job Offer → Hired, plus Reject. Allowed transitions mirror the server matrix via `allowedNextStages()` (`src/lib/candidate-stage-rules.ts`); illegal skips/backward moves are disabled in the UI and rejected server-side. Hiring prompts "close the position?". Rejected candidates can be reopened (target stage + reason). **Withdrawn is recruiter-only** — shown read-only and locks the panel (migration 049).
- Every transition writes an immutable audit row to `candidate_stage_history`, rendered as the timeline (migration 052; see [[Decisions/2026-06-14-candidate-stage-progression-engine]]).

## Key files
- `src/lib/actions/company.ts` — company profile read/update, dashboard stats aggregation, and the notice accept/read helpers (`getCandidateProfileNoticeAccepted`, `acceptCandidateProfileNotice`).
- `src/lib/actions/candidates.ts` — `updateCompanyStage`, `markOfferAccepted`, `closeJobAfterHire`, `reopenCandidate` (the panel's server actions; writers of `company_stage`/`company_viewed_at`).
- `src/lib/candidate-stage-rules.ts` — `COMPANY_STAGE_LADDER`, `allowedNextStages()`, `REOPEN_TARGETS`, `COMPANY_STAGE_TO_STATUS`. The single source of the legal-transition matrix, mirrored client + server.
- `src/lib/candidate-workflow.ts` — `normalizeCandidateStatusForWorkflow`, `INTERVIEW_WORKFLOW_STATUSES`, `TERMINAL_CANDIDATE_STATUSES` (drive funnel column + stat math).
- `src/app/(dashboard)/company/layout.tsx` — approval gate.
- `src/app/(dashboard)/company/candidates/page.tsx` — global funnel; screened-only fetch.
- `src/app/(dashboard)/company/jobs/[id]/page.tsx` — job detail, 5 tabs, admin-client recruiter-name backfill, per-recruiter live-active collapse.
- `src/app/(dashboard)/company/jobs/[id]/candidates/[candidateId]/page.tsx` — candidate detail; ownership check + screened gate + admin-signed CV URL.
- `src/components/dashboard/company/candidate-pipeline.tsx` — 9-column kanban + list toggle.
- `src/components/dashboard/company/company-candidates-overview.tsx` — per-job stat cards + flat list.
- `src/components/dashboard/company/candidate-present-status-panel.tsx` — stage buttons, auto-view, offer-accepted, close-job, reopen, 45-day badge.
- `src/components/dashboard/company/candidate-access-gate.tsx` — one-time view-notice modal.
- `src/components/dashboard/company/candidate-stage-history-timeline.tsx` — audit timeline render.
- `src/components/shared/candidate-detail-sections.tsx` — rich read-only profile, shared with the recruiter portal.

## Data model / migrations
- **`companies`** — `candidate_profile_notice_accepted boolean` (048, one-time view consent); `approval_status` + `approved_at` + `approved_by` (051, admin gate; existing rows default `approved`).
- **`candidates`** — `recruito_screened_at` / `recruito_screened_by` (030, the company-visibility divider); `recruito_rejected_at`/`_by`/`_reason` (044, never screened → never visible); `company_requested_next_step` + `_note`/`_at`/`_by` (010, next-step request metadata surfaced in list view); candidate draft + withdraw states (049, 050). **`company_stage` and `company_viewed_at` are written by `candidates.ts` server actions but have NO defining migration in `supabase/migrations/`** (see "could not verify" below).
- **`candidate_stage_history`** (052) — immutable audit table. INSERTs only via service-role (no INSERT policy/grant); SELECT exposed to the owning company and the presenting recruiter via the `get_company_id()` / `get_recruiter_id()` RLS helpers + `is_admin()`.
- **CV storage** — CVs are signed with the service-role admin client after the page enforces job ownership; no broad storage SELECT policy (054, 059; see [[Decisions/2026-06-21-auth-hardening-and-cv-storage-lockdown]]).
- **Conversations** — `conversation_type` split (055) + per-party Recruito threads (060) drive the company's `client` / `recruito_company` chat tabs.

## Notable changes since the original plan
- **Hard visibility gate added**: the April spec had no Recruito-screening divider. Today every company query is `recruito_screened_at`-filtered, and the detail page hard-returns `notFound()` for unscreened rows.
- **One-time view-consent notice + auto-view event** (048): opening a candidate now actively notifies the recruiter and is gated behind a company-level acknowledgement that didn't exist in the spec.
- **45-day hiring timeline replaced the original 5-day response window** — the panel comment documents the swap explicitly.
- **Full company-driven stage engine** (052/049): legal-transition matrix, reject/reopen, hire→close-job prompt, recruiter-only withdrawn lock, and an immutable audit timeline — a much larger surface than the spec's flat status.
- **Admin-client name backfill**: because `profiles` RLS hides recruiter names from companies, both the job-detail and candidate-detail pages re-fetch recruiter `full_name` via the service-role client. Spec assumed plain joins.
- **Admin approval gate** (051): companies can be parked in `pending` and locked out of the dashboard — not in the original plan.
- **Two divergent funnel UIs**: a 9-column kanban (`/company/candidates`) and a 3-stat flat list (per-job tab). They don't share a column model.

## Related decisions & notes
- [[Decisions/2026-06-14-candidate-stage-progression-engine]] — the stage matrix + audit-trail design.
- [[Decisions/2026-06-11-candidate-status-predicate-consolidation]] — the normalize/terminal-status helpers the funnel math relies on.
- [[Decisions/2026-06-21-auth-hardening-and-cv-storage-lockdown]] — service-role CV signing + ownership checks used on the detail page.
- [[Decisions/2026-06-24-split-recruito-threads]] — the `client` vs `recruito_company` chat split on the detail page.
- [[Decisions/2026-06-22-messaging-rls-service-role-creation]] — why conversation creation routes through service-role.
- [[Decisions/2026-06-23-rls-recursion-jobs-policy-outage]] / [[Decisions/2026-06-22-recruiter-mandate-job-read-rls]] — RLS context behind the admin-client name backfills.
- [[Decisions/2026-06-01-mandate-expiry-recycle]] — the per-recruiter live-active collapse logic in the Recruiters tab.
- [[Decisions/2026-06-28-admin-revenue-source-of-truth]] — adjacent dashboard-stat accounting (admin side).
