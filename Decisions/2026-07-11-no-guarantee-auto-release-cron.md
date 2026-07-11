# No auto-release cron for guarantee payouts

**Date:** 2026-07-11
**Status:** Decided (revisit at higher volume)

## Context

Expired guarantees (`guarantee_active` past `guarantee_end_date`) are
processed by the admin **"Process guarantees"** button
(`processGuaranteeExpirations` in `placements.ts`), which releases the
recruiter payout for each. No cron does this automatically — the only
scheduled guarantee job is the daily 08:00 reminder emails
(`/api/guarantee/reminders`).

## Decision

Keep payout release **manual**. The button click is a deliberate human
checkpoint before money moves: the admin's last chance to catch a candidate
who left near the end of the guarantee but wasn't yet marked failed. At
current volume (a handful of active guarantees) the clicking cost is near
zero; the daily reminders already nudge.

## Revisit trigger

When guarantee volume makes manual processing a chore. The safe design is
already sketched in the code comment: extract the action body into a
non-action helper, gate a cron route with `CRON_SECRET` (header auth, like
`/api/guarantee/reminders`), and skip any placement with a pending breach
report.
