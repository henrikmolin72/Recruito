# Candidates & Workflow Engine — As-Built (2026-06-29, migrations through 061)

> Current-state companion to the original build spec [[Architecture/06-JOB-SYSTEM]]. The spec is the frozen April plan; this note is what the code actually does now.

## What it does today

The candidate lifecycle runs as **two parallel status fields** on `candidates`, plus an append-only audit table:

- **`candidates.status`** — the recruiter/pipeline state machine (the `candidate_status` Postgres enum). Drives recruiter views, placement automation, metrics, and auto-reject cascades.
- **`candidates.company_stage`** — the client-facing ladder (`viewed → interview → final_interview → job_offer → hired`, plus `rejected` side-exit). Driven only by the company.
- **`candidate_stage_history`** — one immutable row per company-stage transition (migration 052).

Flow end to end:

1. **Draft** (`saveDraftCandidate`, `candidates-extended.ts`) — `status='draft'`, partial data allowed, no validation/duplicate/cap checks, never visible to the client, never queued to Recruito. Full structured column set is persisted via the shared `parseCandidateColumns` so resuming a draft restores compensation/employment/notice/contact/screening (the draft data-loss fix). Deletable only while `status='draft'` (`deleteDraftCandidate`).
2. **Present** (`createCandidateExtended`) — server-authoritative required-field gate (`getMissingRequiredFields` in `candidate-form.ts`), CV upload with content-validated MIME, duplicate + cross-job "client already engaged" detection. Inserts with `status='reviewing'` (or `'client_already_engaged'` when the same identity is active on another of the company's jobs). **No client-facing notification at insert** — the candidate is invisible to the client until Recruito approves it.
3. **Recruito screening** (`markCandidateRecruitoScreened`, admin-only, `candidates.ts`) — the `recruito_screened_at` timestamp is the **visibility divider**. Setting it fires the "candidate presented" notification to the company, runs the AI evaluation (`setScore=true`, non-blocking via `after()`), and auto-pauses the job once the approved-candidate cap is hit. A paused/ended job is blocked here before approval. Alternatively the admin can **reject at screening** (`rejectCandidateAtScreening`) → terminal `status='recruito_rejected'`, candidate never crosses the divider.
4. **Pipeline progression** — recruiter moves via `updateCandidateStatus` / `moveCandidateToPipelineStage` (both gated by `canTransitionCandidateStatus`); company moves via `updateCompanyStage` (gated by the `candidate-stage-rules.ts` matrix).
5. **Withdraw** (`withdrawCandidate`) — the recruiter's **only** exit action (recruiters can no longer reject). Requires a structured reason key; blocked once Hired/terminal.
6. **Reopen** (`reopenCandidate`) — company-only; brings a `rejected` candidate back into an in-process stage.
7. **Hire / close** — hiring no longer auto-closes the job. `updateCompanyStage('hired')` only marks the candidate hired; the company separately calls `closeJobAfterHire` to fill the job and auto-reject the rest. A job may legitimately hold multiple hired candidates.

### The status state machine (`candidate-workflow.ts`)

- **`ALL_CANDIDATE_STATUSES`** = `LEGACY_CANDIDATE_STATUSES` (draft, submitted, reviewing, interview, offered, hired, guarantee_period, completed, rejected, declined, paused) + `NEW_CANDIDATE_WORKFLOW_STATUSES` (the migration-013/044 enum values). `CandidateWorkflowStatus` is the union type.
- **`normalizeCandidateStatusForWorkflow`** collapses legacy aliases onto new values (`reviewing→under_client_review`, `interview→interview_stage_1`, `offered→offer_in_progress`, `paused→on_hold`, `rejected→rejected_client`, `declined→offer_declined`, `guarantee_period→guarantee_tracking`); unknown/empty → `submitted`. Every predicate normalizes first so legacy rows count consistently.
- **Sets:** `TERMINAL_CANDIDATE_STATUSES`, `HIRED_PIPELINE_CANDIDATE_STATUSES` (hired/invoice/guarantee — never auto-rejected), `REJECTED_CANDIDATE_STATUSES` (Recruito- or client-rejections only; deliberately excludes withdrawn/declined/completed), `INTERVIEW_WORKFLOW_STATUSES`.
- **Predicates:** `isCandidateInProcess` (not terminal, not hired-pipeline — single source of truth for pending counts + auto-reject cascades; note it treats `draft` as in-process), `isCandidateRejected`, `isCandidateSubmitted` (= left draft; a superset, not summable), `isCandidateInInterview`. `countRecruiterCandidateBuckets` (mutually exclusive, drafts excluded from active) and `countCompanyCandidateBuckets` (NOT mutually exclusive) drive the admin tables.
- **`TRANSITIONS`** map + `getAllowedCandidateTransitions` / `canTransitionCandidateStatus` enforce the legal status graph (incl. legacy-status edges). Null current status → only `submitted`/`under_client_review`.
- **Withdraw rules:** `CANDIDATE_WITHDRAW_REASONS` (10 keys), `CANDIDATE_WITHDRAW_BLOCKED_STATUSES` (= terminal ∪ hired/invoice/guarantee).
- **`statusChangeTimestampPatch`** stamps `reviewed_at`/`interview_at`/`offered_at`/`hired_at` alongside `status_changed_at`. `inferInterviewWorkflowStatus` maps a pipeline-stage title (or current status) to the right interview sub-stage.

### Company-stage matrix (`candidate-stage-rules.ts`)

Pure, server-import-free module. Forward-only single steps: `viewed→interview→final_interview→job_offer→hired`; `rejected` reachable from every active rung; `null→viewed` only. `COMPANY_STAGE_TO_STATUS` (exhaustive by type) syncs `company_stage` onto `candidates.status` (e.g. `interview→interview`, `job_offer→offer_in_progress`, `hired→hired`, `rejected→rejected_client`; `viewed→null` leaves status untouched). `canReopenTo` allows reopen into interview/final_interview/job_offer only (never `viewed`).

## Key files

- `rekryteringsplattform/src/lib/candidate-workflow.ts` — status enum, normalize, terminal/hired/rejected/interview sets, predicates, bucket counters, transition map, withdraw rules, timestamp patch.
- `rekryteringsplattform/src/lib/candidate-stage-rules.ts` — pure company-stage ladder + `canTransition`/`canReopenTo` + `COMPANY_STAGE_TO_STATUS`.
- `rekryteringsplattform/src/lib/actions/candidates.ts` — server actions: `updateCandidateStatus`, `withdrawCandidate`, `moveCandidateToPipelineStage`, `requestCandidateNextStep`, `updateCompanyStage`, `reopenCandidate`, `closeJobAfterHire`, `markOfferAccepted`, `markCandidateRecruitoScreened`, `rejectCandidateAtScreening`. Auth via `getActorRoleForCandidateAction` (company/recruiter resolution + job_id ownership/IDOR check).
- `rekryteringsplattform/src/lib/actions/candidates-extended.ts` — `createCandidateExtended` (Present), `saveDraftCandidate`, `deleteDraftCandidate`, `screenDraftCandidate` (recruiter AI self-check), shared `uploadCandidateCv`.
- `rekryteringsplattform/src/lib/candidate-form.ts` — pure, non-`"use server"`; `parseCandidateColumns`, `getMissingRequiredFields`, `hasCandidateCompensationData`. Imported by both the server action and the client form so draft vs. present can't drift.
- `rekryteringsplattform/src/lib/candidate-stage-history.ts` — `logCandidateStageChange` (best-effort, admin-client insert, never throws).

## Data model / migrations

`candidates` table (`candidate_status` enum), plus the `candidate_stage_history` table.

**Stage columns on `candidates`** (both present in production):

- **`current_pipeline_stage`** (TEXT) — added by migration **008** `pipeline_stages` (`ALTER TABLE candidates ADD COLUMN current_pipeline_stage TEXT`; NULL = pre-pipeline "submitted" state; indexed via `idx_candidates_pipeline_stage`). This is the per-job pipeline-stage pointer (stage `id` from `jobs.pipeline_stages`).
- **`company_stage`** — the client-facing ladder this note describes throughout. **DRIFT: this column exists in production but is defined in NO committed migration (001–061).** It is an out-of-band / undocumented schema addition not reproduced by the committed migration set; re-running the migrations from scratch would NOT create it. The state-machine behavior documented above is verified-correct; only its schema provenance is unaccounted for.

- **013** `candidate_workflow_statuses` — adds the 18 new enum values (duplicate_rejected … candidate_withdrawn).
- **019** `form_review_changes` — job-side form columns (management/team, key_requirements, language_requirements, num_interviews); shapes the screening/interview inputs candidates answer against.
- **020** `candidate_submission_extended_fields` — the full 6-section candidate column set: location/work_authorization/**ai_match_score**, employment_status(+reason)/other_processes, salary/benefits/notice, first_contact_date/contact_method/screening_answers/language_proficiency, assessment_summary/recruiter_declaration.
- **036** `expected_salary_below_reason` — `expected_salary_below_current_reason` (only persisted when expected < current).
- **044** `recruito_screening_reject` — adds enum value `recruito_rejected` + `recruito_rejected_at`/`_by`/`recruito_reject_reason` columns (admin screening reject).
- **049** `candidate_withdraw` — `withdraw_reason` + `withdrawn_at` (uses existing `candidate_withdrawn` enum value).
- **050** `candidate_draft` — adds enum value `draft`.
- **051** `company_approval` — `companies.approval_status` ('pending'/'approved'/'suspended'/'rejected'), `approved_at`/`approved_by`, index. NOTE: this is the **company-account** admin-approval gate (mirrors `recruiters.approval_status`), distinct from the per-candidate Recruito screening divider (`recruito_screened_at`) and from the `company_stage` ladder.
- **052** `candidate_stage_history` — audit table; RLS SELECT-only to the owning company / presenting recruiter (via `get_company_id()`/`get_recruiter_id()`/`is_admin()`); inserts are admin-client only (no INSERT grant). `GRANT SELECT … TO authenticated`.

(Companion non-target migrations referenced by this area's code: 030/mandate-stages established the `recruito_screened_at` visibility divider; 053 added the `claim_mandate` slots-cap function alongside 052 in the same stage-engine ADR.)

## Notable changes since the original plan

- **Two-axis status model.** The April plan's single linear candidate status grew into parallel `status` (recruiter/pipeline) + `company_stage` (client ladder), kept in sync by `COMPANY_STAGE_TO_STATUS`. Legacy single-axis statuses are preserved and normalized rather than migrated.
- **Recruiters can no longer reject.** Their only exit is `withdrawCandidate` with a structured reason; rejection is now exclusively a client action (`rejected_client`) or a Recruito screening action (`recruito_rejected`).
- **Recruito screening is a hard visibility divider.** Candidates are invisible to the client until `markCandidateRecruitoScreened`; the "presented" notification, AI scoring, and cap-based auto-pause all moved to that approval moment instead of insert time.
- **Hire decoupled from auto-close.** Hiring marks only the candidate; `closeJobAfterHire` is a separate explicit company action — so jobs can carry multiple hires.
- **Reopen path** for rejected candidates (`reopenCandidate`), absent from the original spec.
- **Server-authoritative draft path + shared parser.** Drafts now persist the same structured columns as Present via `candidate-form.ts`, closing the silent data-loss gap where resumed drafts shipped empty compensation/screening data.
- **Predicate consolidation.** Four drifted hand-rolled status sets collapsed into `candidate-workflow.ts` (see ADR below).
- **Full company-stage audit trail** (`candidate_stage_history`) — not in the April plan.

## Related decisions & notes

- [[Decisions/2026-06-14-candidate-stage-progression-engine]] — the company-stage matrix, reopen, hire/close decoupling, audit table (migration 052), slots-cap atomicity (053).
- [[Decisions/2026-06-11-candidate-status-predicate-consolidation]] — `candidate-workflow.ts` as the single source of truth for terminal/hired/in-process predicates.
- [[Dev-Notes/deployment-runbook]] — references this area's migration/deploy ordering.
- Cross-area: presentation gating against paused/ended jobs shares `REFERRAL_BLOCKED_JOB_STATUSES` with the job system — see [[Architecture/06-JOB-SYSTEM]].
