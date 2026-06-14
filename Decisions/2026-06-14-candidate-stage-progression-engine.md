# Candidate stage-progression engine + slots-cap atomicity

- Date: 2026-06-14
- Status: accepted
- Driver: client feedback round (image set `14-06-*`, esp. `14-06-02` + written stage spec)

## Context

The company-facing candidate "Present Status" panel let the client move a candidate to
any stage with no rules. The client requires enforced progression, a reopen path for
rejected candidates, a full audit history, and an explicit "close job?" decision after a
hire. Separately, the recruiter slots cap could be exceeded by a check-then-insert race.

## Decisions

### 1. Transition matrix (company-driven `candidates.company_stage`)

| From | Allowed → |
|------|-----------|
| (none) | viewed (auto first-view only) |
| viewed | interview · rejected |
| interview | final_interview · rejected |
| final_interview | job_offer · rejected |
| job_offer | hired · rejected |
| hired | — terminal |
| rejected | *(reopen action only)* → interview / final_interview / job_offer |
| withdrawn | — terminal (recruiter-set) |

Forward-only, single-step. No skipping, no backward moves. Reject reachable from any
active stage. Reopen never returns to `viewed`.

### 2. Server-authoritative enforcement

Rules live in a pure module `src/lib/candidate-stage-rules.ts` (unit-tested), enforced in
`updateCompanyStage()` (the authority) and mirrored in the panel UI (invalid buttons
disabled). The load-bearing `candidates.ts` change is pinned by tests written first (§6).

### 3. Hire decoupled from auto-close (behavior change)

Previously, marking **Hired** immediately called `markJobFilledAndReject` (filled the job +
rejected everyone). Now Hired only sets the candidate hired. The UI then asks **"Close this
job position?"** — **Yes** → `closeJobAfterHire(jobId, hiredCandidateId)` (status=filled +
reject remaining active except hired); **No** → job stays open, nothing else rejected, and
the prompt re-appears after each future hire. Consequence: a job may legitimately have
multiple hired candidates.

### 4. Reopen

New company-only action `reopenCandidate(candidateId, jobId, targetStage, reason?)`. Valid
only when the candidate is rejected; target ∈ {interview, final_interview, job_offer};
restores an in-process status; logs to history with the optional reason.

### 5. Audit history

New table `public.candidate_stage_history` (from_stage, to_stage, action, changed_by,
changed_by_role, reason, created_at). `GRANT SELECT ... TO authenticated` with RLS scoping
reads to the job's company owner or the candidate's recruiter; writes go through the admin
client server-side. Every transition (move / reject / reopen / withdraw / hire) is logged.
Surfaced as a timeline on the candidate detail page. Migration `052`.

### 6. Slots-cap atomicity

New `public.claim_mandate(p_job_id, p_recruiter_id)` SECURITY DEFINER function: locks the
job row, counts active mandates, inserts only if under `max_recruiters`, returns
`ok|full|already`. `GRANT EXECUTE ... TO authenticated`. `claimMandate()` calls it instead
of the racy check-then-insert. Migration `053`.

## Notes

Migrations 052/053 must be applied before deploy. Migrations are authored as files and
reviewed before being applied to the database.
