# Admin Panel — As-Built (2026-06-29, migrations through 061)
> Current-state companion to the original build spec [[Architecture/10-ADMIN-PANEL]]. The spec is the frozen April plan; this note is what the code actually does now.

## What it does today
The admin panel is the operations console for the marketplace. All data access goes through server actions in `src/lib/actions/admin.ts`, each gated by `requireAdmin()`, which trusts **only** `app_metadata.role === "admin"` (user_metadata is user-writable and explicitly distrusted). Reads use the service-role `createAdminClient()` to bypass RLS; the route group adds a second redirect gate in `admin/layout.tsx`.

- **Dashboard (`/admin`)** — eight stat cards from `getAdminStats()`. Two figures are deliberately non-obvious:
  - *Total Candidates* counts only presented candidates: `.neq("status", "draft")` (drafts are not submissions).
  - *Platform Revenue* = Σ over placements of `max(job.client_fee_amount − job.recruiter_fee_amount, 0)`, read per-placement via an embedded select on `jobs`. The placement's own `total_fee`/`platform_fee`/`recruiter_fee` snapshots are **stale 15%-of-salary seeds** and are intentionally NOT used here (see [[Decisions/2026-06-28-admin-revenue-source-of-truth]]). A `.limit(1000)` cap and query errors are logged (not thrown) because a silent truncation would understate a money figure.
- **Recruiter approvals** — `approveRecruiter()` requires a complete 4-point KYC checklist (`linkedin_verified`, `email_domain_match`, `experience_credible`, `agreement_signed`) all `true`, persisted as JSONB; optional `notes` trimmed to 2000 chars. Sibling actions: `rejectRecruiter()` (reason required, ≤1000 chars), `suspendRecruiter()`, `reactivateRecruiter()` (re-approve without re-running KYC). `getPendingRecruiters()` feeds the dashboard queue; `getAdminRecruiters()` / `getAdminRecruiterById()` / `updateAdminRecruiter()` back the recruiters list + detail.
- **Company approvals** — `approveCompany()` flips `approval_status` to approved; companies follow the same pending→approved gate as recruiters (migration 051). `getAdminCompanies()` / `getAdminCompanyById()` / `updateAdminCompany()` back the companies list + editable detail (incl. billing fields, `is_verified`).
- **Fee config (per-job, on `/admin/jobs`)** — admin edits the locked job fees inline: `updateClientFeeAmount()`, `updateRecruiterFeeAmount()`, `updateRecruiterFeePercentage()` (0–100). Per-job caps: `setJobMaxRecruiters()` (1–10, can't drop below current assigned count) and `setJobMaxCandidates()` (1–200, used to "reopen" a job for more submissions).
- **Client-fee re-confirm flow** — when the admin-set `client_fee_amount` exceeds the client-declared `client_fee_amount_estimated`, `requestClientFeeReconfirm()` transitions the job to `pending_client_reconfirm`, writes the proposed amount + uplift reason/note, and best-effort sends an in-app notification + email. Status-guarded `.in("status", [...])` update prevents races. `withdrawClientFeeReconfirm()` is a one-click revert back to the estimate and republishes the job (`status="active"`, decision `"withdrawn"`).
- **Screening queue (`/admin/candidates`, "Step 7")** — `getCandidatesForScreening()` lists non-draft candidates with `recruito_screened_at` state; `getCandidateScreeningDetail()` surfaces the full submission. Note: the **mutations** (mark-screened / reject) live in `src/lib/actions/candidates.ts` (`markCandidateRecruitoScreened`, `rejectCandidateAtScreening`), not in `admin.ts`.
- **Broadcasts (`/admin/notifications`)** — `sendAdminNotification()` targets all / all_recruiters / all_companies / specific user IDs. Links are sanitized to same-origin paths only (rejects `//`, absolute, `javascript:`); title is CRLF-stripped to defend against header/log injection. `getAdminNotificationHistory()` regroups individual rows into batch sends by title+body+5s-bucketed timestamp.
- **Analytics (`/admin/analytics/*`)** — five read-only dashboards (recruiters, jobs, candidates, companies, earnings) with a `30d/90d/ytd/all` time range. The earnings dashboard still derives revenue from placement `platform_fee` snapshots — a different basis than the main dashboard card (see Notable changes).
- **Placements (`/admin/placements`)** — `getAdminPlacements()` (latest 10) with guarantee / invoice / payment timestamps; actions handled by `placement-actions` components.
- **Guarantee management (`/admin/guarantees`)** — page-level read (own `admin`-role check via `createAdminClient()`, not `requireAdmin()`): lists placements in `status="guarantee_active"` with a non-null `guarantee_end_date` (the active-guarantee dashboard), plus all rows from `guarantee_breach_reports` (`admin_status`, reason, refund amount) for breach review. Breach actions are served by the API routes `app/api/guarantee/breach/route.ts` + `.../review/route.ts`.
- **Data rights requests (`/admin/data-rights`)** — GDPR queue. `getPendingDataRightsRequests()` lists open requests; `markDataRightsRequestComplete()` resolves one (both in `src/lib/actions/data-rights.ts`).
- **Recruito messages (`/admin/messages`)** — admin side of the in-app Recruito chat. `getRecruitoConversationsForAdmin()` lists per-party conversations; `sendAdminMessage()` (and `sendAdminMessageToConversation()`) post as Recruito (both in `src/lib/actions/admin-messages.ts`).
- **Settings (`/admin/settings`)** — **non-functional**: a static form with hard-coded `defaultValue`s (fee 15, platform share 25, guarantee 90, caps, sender email). No server action is wired; "Save" does nothing. Real config is per-job, not global.

## Key files
- `src/lib/actions/admin.ts` — all admin server actions (stats, approvals, fee config, screening reads, broadcasts, detail/edit).
- `src/lib/actions/require-admin.ts` — `requireAdmin()` auth gate (app_metadata.role only).
- `src/app/(dashboard)/admin/layout.tsx` — route-level redirect gate (defense in depth).
- `src/app/(dashboard)/admin/page.tsx` — dashboard, stat cards, pending-recruiter queue, recent placements.
- `src/app/(dashboard)/admin/jobs/page.tsx` — fee/cap editors, approve + re-confirm UI.
- `src/app/(dashboard)/admin/candidates/page.tsx` — screening queue (reads `getCandidatesForScreening`).
- `src/app/(dashboard)/admin/{recruiters,companies}/` — list + `[id]` detail/edit routes.
- `src/app/(dashboard)/admin/notifications/page.tsx` — broadcast composer (client component).
- `src/app/(dashboard)/admin/settings/page.tsx` — static, unwired settings form.
- `src/lib/actions/candidates.ts` — `markCandidateRecruitoScreened` / `rejectCandidateAtScreening` (screening mutations).
- `src/lib/fee-reconfirm.ts` — uplift reason validation (`isValidUpliftReason`, `reasonI18nKey`).
- `src/lib/candidate-workflow.ts` — `countRecruiterCandidateBuckets` / `countCompanyCandidateBuckets` (canonical status bucketing reused in list views).

## Data model / migrations
- **`recruiters`** — `approval_status` (pending/approved/suspended/rejected), `approved_at`/`approved_by`; `kyc_checklist` JSONB + `kyc_rejection_reason` added in **040_recruiter_kyc**. Perf columns (`perf_*`) feed analytics.
- **`companies`** — `approval_status` gate (pending/approved/suspended/rejected) + `approved_at`/`approved_by` + index, added in **051_company_approval** (existing rows default `approved`).
- **`jobs`** — locked fees `client_fee_amount` / `recruiter_fee_amount` + `is_exclusive` in **033_locked_job_fees** (backfilled from salary × fee%). Re-confirm columns (`client_fee_amount_estimated`, `client_fee_amount_proposed`, `client_fee_uplift_reason`/`note`, `client_fee_reconfirm_requested_at`/`resolved_at`/`decision`) and the `pending_client_reconfirm` status in **034_client_fee_reconfirm**. `max_candidates` cap in **032_jobs_max_candidates_cap**; `recruiter_fee_percentage` in **026**.
- **`candidates`** — `recruito_screened_at` gate from **030_process_flow_gates**; reject path (`recruito_rejected` status + `recruito_rejected_at`/`_by`/`recruito_reject_reason`) in **044_recruito_screening_reject**; `draft` status in **050_candidate_draft** (the value `getAdminStats` excludes).
- **`notifications`** — broadcast target table (i18n keys via **041_notification_i18n**).

## Notable changes since the original plan
- **Revenue basis corrected (2026-06-28)** — dashboard revenue moved from the placement `platform_fee` snapshot (which yielded the rejected 7650) to Σ(job `client_fee_amount − recruiter_fee_amount` = 8730). Total Candidates now excludes drafts (38→37). See [[Decisions/2026-06-28-admin-revenue-source-of-truth]].
- **Two revenue bases coexist (current behavior)** — the main dashboard card uses job negotiated fees, while `getEarningsAnalytics()` (`admin.ts` ~862) sums placement `platform_fee`. This is the present state of the code, not a dated change: the two bases differ from each other and from the corrected `getAdminStats()` revenue, and are not reconciled (flagged here as drift, not a bug).
- **KYC gate added** — recruiter approval is no longer a single button; it requires the 4-point checklist (migration 040), stored auditable as JSONB.
- **Company approval gate added** — companies gained the same pending→approved lifecycle as recruiters (migration 051); not in the original April spec.
- **Client-fee re-confirm consent loop** — the uplift/propose/withdraw flow (migration 034) is entirely post-April.
- **Per-job fee + cap config replaced global settings** — fees, recruiter %, recruiter cap, and candidate cap are all per-job inline editors on `/admin/jobs`. The global `/admin/settings` form was never wired and remains static.
- **Screening reject path** — "Step 7" gained a terminal reject action (`recruito_rejected`, migration 044) alongside mark-screened.

## Related decisions & notes
- [[Decisions/2026-06-28-admin-revenue-source-of-truth]] — revenue source of truth; draft exclusion; 1000-row cap follow-up.
- [[Decisions/2026-06-23-rls-recursion-jobs-policy-outage]] — why admin reads use service-role `createAdminClient()` (admin was unaffected by the RLS-recursion outage that took down company/recruiter login).
- [[Decisions/2026-06-14-candidate-stage-progression-engine]] — candidate status lifecycle the screening queue reads against.
- [[Dev-Notes/migration-grant-snippet]] — `GRANT` requirement for new `public.*` tables (see [[Decisions/2026-05-27-supabase-public-grant-default]]).
- Cross-area: [[Architecture/As-Built/04-JOB-SYSTEM]] (job fee/status model), [[Architecture/As-Built/05-CANDIDATES-WORKFLOW]] (candidate statuses), [[Architecture/As-Built/06-SCREENING-AI]] (Step-7 screening).
