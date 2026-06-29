# Architecture — As-Built (current state)

Code-grounded snapshot of what the Recruito app **actually does today** (as of 2026-06-29,
migrations through 061). These are the companion to the original Swedish build spec in
`Architecture/00–11`, which is the **frozen April plan** (migration-004 era) and is kept as
historical record — do not rewrite it. When an area changes shape, update the matching note here.

Each note was written by an agent reading that area's real code, then adversarially verified
against the code by a second agent. See [[Dev-Notes/vault-sync-runbook]] for how to keep these current.

## Notes

- [[As-Built/00-DATABASE-AND-MIGRATIONS]] — schema + full migrations ledger (001→061)
- [[As-Built/01-AUTH-AND-ACCESS]] — auth, `requireAdmin`, RLS policies & recursion history
- [[As-Built/02-COMPANY-PORTAL]] — company dashboard, candidate funnel & detail view
- [[As-Built/03-RECRUITER-PORTAL]] — marketplace, mandates, pipeline tabs
- [[As-Built/04-JOB-SYSTEM]] — job lifecycle, fees, pause/reopen, max-candidate cap
- [[As-Built/05-CANDIDATES-WORKFLOW]] — candidate status state machine, stage history
- [[As-Built/06-SCREENING-AI]] — pre-submission AI screening, match score, shortlist generator
- [[As-Built/07-MESSAGING]] — conversations, per-party Recruito thread split, support thread
- [[As-Built/08-NOTIFICATIONS]] — in-app + email dispatch, i18n notifications
- [[As-Built/09-PAYMENTS-PLACEMENTS]] — placement state machine, guarantees, fee reconfirm
- [[As-Built/10-ADMIN-PANEL]] — admin dashboards (stats, approvals, data-rights, guarantees, messages)
- [[As-Built/11-SHARED-I18N-COMPLIANCE]] — shared UI, i18n dictionaries, landing, EU AI Act compliance

> Caveat surfaced during this sync: the `candidates.company_stage` column exists in production but is
> defined in **no committed migration** — a schema-vs-migration drift noted in [[As-Built/05-CANDIDATES-WORKFLOW]].
