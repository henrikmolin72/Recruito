# Client fee re-confirmation flow

**Date:** 2026-04-29
**Status:** Approved, awaiting implementation plan
**Related work:** commit `3ccf930` (locked job-level fees)

## Problem

Clients tick a declaration that includes the calculated fee at job submission. Admin can adjust `client_fee_amount` during internal review before approving. Today there is no signal back to the client when the final fee differs from what they ticked — particularly bad if it goes up. We need an explicit re-confirmation step on increases, while keeping the path frictionless when the fee is unchanged or lower.

## Decisions locked during brainstorming

- **Trigger:** at admin Approve time. Admin can stage edits freely; the gate fires when they click Approve and `client_fee_amount > client_fee_amount_estimated`.
- **Baseline:** `client_fee_amount_estimated` snapshotted once at declaration submit, never mutated.
- **Channel:** email + in-app banner; action only happens in-app (no magic-link approve from email).
- **Reason:** required preset dropdown + optional free-text note. Free-text required only when reason = `custom`.
- **Rejection:** routes the job back to `pending_approval` so admin can revise. Admin can also one-click withdraw to the original estimate as a fallback.

## State machine

```
draft
  └─ submit ─→ pending_approval ─┬─ admin Approve, fee unchanged or ↓ ─→ active
                                  │
                                  └─ admin Approve, fee ↑ ─→ pending_client_reconfirm
                                                              ├─ client Approve  ─→ active
                                                              ├─ client Reject   ─→ pending_approval (admin notified)
                                                              └─ admin Withdraw ─→ active (at original estimate)
```

New status: `pending_client_reconfirm`. No new dead-end states. Rejection re-opens the existing pending bucket.

## Data model

New columns on `jobs` (migration `034_client_fee_reconfirm.sql`):

| column | type | semantics |
|---|---|---|
| `client_fee_amount_estimated` | `numeric` | The fee the client ticked the declaration for. Set once when status transitions `draft` → `pending_approval`. Never mutated by any later action. |
| `client_fee_amount_proposed` | `numeric` | The higher amount admin wants to charge. Set when entering `pending_client_reconfirm`. Cleared on resolve. |
| `client_fee_uplift_reason` | `text` | One of: `hard_to_fill`, `niche_specialist`, `senior_executive`, `urgent_timeline`, `custom`. Required when entering `pending_client_reconfirm`. App-validated against the fixed list — no DB enum so we can add reasons without migrations. |
| `client_fee_uplift_note` | `text` | Optional, required when reason = `custom`. |
| `client_fee_reconfirm_requested_at` | `timestamptz` | Set on entering `pending_client_reconfirm`. Updated when admin re-arms with a new amount. |
| `client_fee_reconfirm_resolved_at` | `timestamptz` | Set on Approve / Reject / Withdraw. |
| `client_fee_reconfirm_decision` | `text` | `approved` \| `rejected` \| `withdrawn`. Stores latest outcome only — full history lives in the notifications table. |

Status enum gets one new value: `pending_client_reconfirm`.

`client_fee_amount` keeps its existing meaning — the fee that *will be* charged when the job is live. The new columns wrap consent state around it.

### Backfill

For every existing row with `status = 'pending_approval'`, set `client_fee_amount_estimated = client_fee_amount` so the gate has a baseline. Other rows can leave estimated NULL — they're either drafts (no estimate yet) or already active (gate doesn't apply).

## UI surfaces

### Company side

1. **Declaration page** — keep existing fee display. Add disclaimer line: *"This is an estimate. If we adjust it during review, we'll ask you to re-confirm before publishing."* New i18n key in en/sv/no/da.
2. **Job detail (`/company/jobs/[id]`)** — when `status = 'pending_client_reconfirm'`, replace the static fee banner with a re-confirm card. Card shows: original estimate, proposed amount, delta in absolute + %, reason (translated label), admin's optional note, currency. Two buttons: **Approve new fee** / **Reject**. Persists until resolved.
3. **Dashboard banner** — when one or more of the company's jobs are in `pending_client_reconfirm`, render a top-of-page banner *"{n} job{s} need your re-confirmation"* linking to the first one. Single count query in the existing `(dashboard)/company/layout.tsx`.

### Admin side

1. **Admin jobs row, status = `pending_approval`** — when `client_fee_amount > client_fee_amount_estimated`, the existing Approve button changes label to **"Approve & request client re-confirm"**. Click opens a small modal: reason dropdown + optional note (required if custom). Submit calls `requestClientFeeReconfirm`.
2. **Admin jobs row, status = `pending_client_reconfirm`** — show muted line "Awaiting client re-confirm (sent {date})" + button **Withdraw to original** (one-click, no modal).
3. The plain Approve button still works unchanged for the unchanged-or-decreased path.

### Email

Single new template: *"Fee re-confirmation needed for {job title}"*. Body shows original, proposed, currency, translated reason label, optional note, deep link to the job detail page. Reuses the existing `sendUserEmail` + `email-templates.ts` plumbing. One template per locale (en/sv/no/da) following the pattern already in the file.

## Server actions

### `lib/actions/admin.ts`

```ts
// Atomic: status → pending_client_reconfirm, sets proposed/reason/note + requested_at,
// clears any prior decision/resolved_at from a previous reject cycle,
// inserts in-app notification, sends email.
// Validates reason in fixed enum and that client_fee_amount > estimated.
requestClientFeeReconfirm(
  jobId: string,
  reason: 'hard_to_fill' | 'niche_specialist' | 'senior_executive' | 'urgent_timeline' | 'custom',
  note?: string,
): Promise<{ success: true } | { error: string }>

// One-click revert. Copies estimated → client_fee_amount, clears proposed/reason/note,
// status → active, decision = 'withdrawn', publishes (sets published_at if null,
// triggers notifyMatchingRecruitersAboutJob).
withdrawClientFeeReconfirm(jobId: string): Promise<{ success: true } | { error: string }>
```

### `lib/actions/jobs.ts` (company-scoped, uses `verifyJobOwnership`)

```ts
// Verifies job belongs to caller's company AND status = pending_client_reconfirm.
// Atomic: client_fee_amount = proposed, status = active, decision = 'approved',
// resolved_at = now, published_at = now (if null), notifies admin in-app + email,
// triggers notifyMatchingRecruitersAboutJob.
clientApproveProposedFee(jobId: string): Promise<{ success: true } | { error: string }>

// Same auth + status guard. Status → pending_approval, clears proposed/reason/note,
// decision = 'rejected', resolved_at = now. Estimated stays untouched.
// Notifies admin in-app + email.
clientRejectProposedFee(jobId: string): Promise<{ success: true } | { error: string }>
```

### `createJob` change

When status transitions to `pending_approval` on insert (or update of an existing draft), set `client_fee_amount_estimated = lockedClientFee`. Drafts skip this — they get the estimate when they're submitted for approval.

### `approveJob` (existing) — unchanged

Continues to handle the unchanged-or-decreased path. The admin UI calls `requestClientFeeReconfirm` directly when the increase modal is submitted, so `approveJob` does not branch.

## Edge cases

1. **Re-armed proposals.** Admin re-edits during `pending_client_reconfirm`. New amount overwrites `proposed`, `requested_at` updates, fresh email goes out. Prior in-app notifications remain as history.
2. **Stale estimate.** If admin edits salary / guarantee / exclusive after the client ticked the declaration, `client_fee_amount_estimated` is *not* recomputed. That's the value the client consented to. (Editing those upstream fields is a "scope changed" conversation outside this design.)
3. **Race: simultaneous client Approve + admin Withdraw.** Both actions guard with `WHERE status = 'pending_client_reconfirm'`. First write wins; second returns "Job is no longer awaiting re-confirmation."
4. **Decrease.** No client step. Admin's plain Approve publishes as today. Client sees the lower number once the job is live.
5. **Legacy rows with no estimated value.** Backfill populates pending rows. Anything else is treated as "no gate applies." Drafts created post-migration but pre-submission won't have an estimate yet, which is correct.
6. **Custom reason.** Validation: if `reason === 'custom'` and `note` is empty/whitespace → `{ error: "Note required for custom reason" }`.
7. **Currency.** All amounts stay in `salary_currency`. `formatCurrency(amount, currency)` everywhere — UI, email, banner.
8. **Audit trail.** Notifications table is the history. `client_fee_reconfirm_decision` only stores the latest outcome. If a dedicated audit need shows up later, build the table then — YAGNI for now.

## Out of scope

- A separate audit/history table for fee changes.
- Magic-link approve from email (security trade-off declined; B2B login friction is acceptable).
- Auto-timeout / escalation if the client never re-confirms — manual chase from Recruito ops.
- Toggling `is_exclusive` post-declaration (a different scope-change conversation).
- Recruiter fee changes triggering anything (recruiter payout is internal Recruito↔recruiter).

## Files touched

- `supabase/migrations/034_client_fee_reconfirm.sql` (new)
- `src/types/db-types.ts` (Job interface + status enum)
- `src/types/enums.ts` (status enum if defined there)
- `src/lib/actions/jobs.ts` — `createJob` (snapshot estimated), `clientApproveProposedFee` (new), `clientRejectProposedFee` (new)
- `src/lib/actions/admin.ts` — `requestClientFeeReconfirm` (new), `withdrawClientFeeReconfirm` (new), `getAdminJobs` (return new fields)
- `src/lib/email/email-templates.ts` — new template `feeReconfirmEmail`
- `src/lib/email/internal-notifications.ts` — wire the new template
- `src/components/dashboard/admin/approve-job-button.tsx` — uplift modal + label switching
- `src/components/dashboard/admin/withdraw-reconfirm-button.tsx` (new)
- `src/components/dashboard/company/fee-reconfirm-card.tsx` (new)
- `src/components/dashboard/company/reconfirm-banner.tsx` (new)
- `src/app/(dashboard)/admin/jobs/page.tsx`
- `src/app/(dashboard)/company/jobs/[id]/page.tsx`
- `src/app/(dashboard)/company/layout.tsx` (banner mount)
- `src/app/(dashboard)/company/jobs/new/create-job-form.tsx` (declaration disclaimer line)
- `src/i18n/dictionaries/{en,sv,no,da}.json` — disclaimer key, reason labels, status label, banner copy, email subject/body strings, card buttons

## Verification (definition of done)

- `npm run build` passes in `rekryteringsplattform/`.
- New i18n keys exist in all four dictionaries.
- Manual test matrix:
  1. Submit job, admin Approve unchanged → goes live, no client email.
  2. Submit job, admin lower fee → goes live, no client email.
  3. Submit job, admin raises fee → modal opens, reason+note recorded, status `pending_client_reconfirm`, email sent, banner shown.
  4. Client Approve → live at proposed amount, admin notified.
  5. Client Reject → back to `pending_approval`, admin notified.
  6. Admin Withdraw → live at estimated amount, decision = `withdrawn`.
  7. Admin re-arms with new higher amount during `pending_client_reconfirm` → `proposed` updates, fresh email, banner reflects new number.
  8. Race: client Approve while admin Withdraw → one wins, other returns clear error, no partial state.
- Server-action security: every new action authenticates and validates ownership/role; no raw Supabase errors leaked to the client (per `CLAUDE.md` §6).
