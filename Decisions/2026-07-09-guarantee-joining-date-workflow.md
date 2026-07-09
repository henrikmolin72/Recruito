# Guarantee runs from the client-confirmed joining date, not from "hired"

**Date:** 2026-07-09 · **Status:** built, e2e-verified on local stack; migration 067 pending prod apply
**Trigger:** client feedback (16 annotated screenshots, `Fixes in recruito/garentee /`) — candidates serve
notice periods, so a guarantee that starts at "hired" burns down before day one.

## Decision

Joining-date-gated activation (approved over app-side placement creation and a company-side
"confirm joined" flow):

- `fn_auto_create_placement` (rewritten in migration 067) still creates the placement at hire, but
  always as `confirmed` with `guarantee_end_date NULL` and new `placements.joining_date NULL`.
- Admin enters the joining date (`setPlacementJoiningDate` in
  `rekryteringsplattform/src/lib/actions/placements.ts`) after the client confirms the start.
  End date = joining + `jobs.guarantee_period_months` via `computeGuaranteeEndDate()`
  (Postgres-style month-end clamping), manual override allowed. Activation flips the placement to
  `guarantee_active` and the candidate to `guarantee_tracking`.
- The previously **unused** enum value `payment_received` now means "invoice paid but candidate
  not joined yet" (`recordPlacementPayment` parks there instead of wrongly releasing the payout).
- Recruiter-side "paid" now counts only `payout_released`; company-side "paid" still includes
  `payment_received` (they did pay). Breach refunds use `joining_date ?? start_date` as window start.
- Display status is derived, not raw (`guaranteeDisplayStatus()` in `src/lib/guarantee.ts`):
  failed / completed / active / pending.

## IA changes

`/admin/placements` merged into `/admin/guarantees` (old route redirects; sidebar item removed).
New `Guarantees` nav + page for recruiter (`/recruiter/guarantees`) and company
(`/company/guarantees`) via shared `guarantee-table.tsx`; `active-guarantees-dashboard.tsx` deleted.
Live `GuaranteeTimer` sections on both dashboards. Guarantee period surfaced on: recruiter mandate
detail + Browse Jobs card, company job header, admin job header.

## Gotchas

- Existing rows were backfilled `joining_date = start_date`; in-flight guarantees keep their dates.
- Downstream consumers (expiry processor, reminder cron, breach API, timer) all key off
  `guarantee_end_date`; NULL rows never match — that invariant is what made the change small.
- Local-stack e2e: `.env.local` points at PROD — use the `local-stack-dev` launch config
  (`npx dotenv -e .env.localstack -- next dev`); local test creds `*@local.test` / `test1234-local`.
