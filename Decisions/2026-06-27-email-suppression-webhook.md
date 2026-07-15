# Resend bounce/complaint webhook + email suppression

- **Date:** 2026-06-27
- **Status:** Accepted (built; rollout pending)
- **Area:** Email deliverability / `rekryteringsplattform`

## Context

Email is already fully built on Resend (primary) → SMTP (fallback) via `dispatch()`
in `src/lib/email/internal-notifications.ts`, with ~37 notification sites and ~9
direct senders. There was **no** handling of bounces or spam complaints: we kept
mailing dead and complaining inboxes, which degrades domain reputation and invites
inbox-provider throttling. There was also no inbound webhook anywhere in the app.

## Decision

Add a signed Resend webhook that records hard bounces and complaints into a
suppression table, and enforce that list at the single send chokepoint. All design
decisions were taken via a plan-mode review; every choice below was the recommended
option.

1. **Signature verification** via `resend.webhooks.verify()` (Svix under the hood).
   `svix` is already bundled in `resend@6.12.3`, so **no new dependency** was added.
   The raw request body is used (re-parsing breaks the signature).
2. **Correlate by recipient address** from the event payload (`data.to`). No
   send-side message-id capture — the suppression key *is* the email address.
3. **Enforce in `dispatch()`** — one chokepoint covers every send path and, as a
   side effect, closes the prior gap where `email_opt_out` was only checked on the
   notification path.
4. **Idempotency by construction** — `UNIQUE(email, reason)` + upsert `ON CONFLICT`;
   no separate event-dedup table.
5. **Suppress only permanent failures** — `email.complained` and `email.bounced`
   where `bounce.type === "Permanent"`. Transient/soft bounces are ignored so a
   temporary failure never permanently blocks password-reset / verification mail.
6. **Normalize emails to lowercase** in code (write + read); `reason` CHECK
   constraint. No `citext` extension.
7. **Explicit webhook status map** — 400 (bad/missing signature), 500 (misconfig or
   transient DB failure → Svix retries), 200 (accepted or ignored event type).
8. **Fail open** when the pre-send suppression *lookup* errors — send anyway and log.
   A missed suppression costs one bounce; a false skip blocks critical mail.

## Alternatives considered

- **Add `svix` directly** — unnecessary; `resend.webhooks.verify()` is the same
  thing with zero new deps.
- **Per-caller suppression checks** — repetitive, easy to miss a site (the existing
  opt-out gap is exactly that failure mode).
- **Suppress on any bounce** — over-suppresses; would silently block legitimate
  recipients on transient failures.
- **`email_sends` / `webhook_events` audit tables** — observability scope creep,
  deferred.
- **In-memory suppression cache** — premature; an indexed point read per send is
  negligible and short-circuits the Resend API call for dead addresses.

## Consequences

- New table `public.email_suppressions` (migration 062): service-role only, RLS on,
  **no policy / no GRANT** (per CLAUDE.md §6).
- `dispatch()` does one indexed lookup per send; suppressed sends skip the provider
  call entirely (net positive).
- Suppression list grows monotonically — correct: hard bounces/complaints are
  permanent; no automated un-suppression.
- Tests: 21 new (signature, event mapping, idempotency, dispatch enforcement);
  full suite 171 green, lint clean, build green.

## Deferred / out of scope

List-Unsubscribe header · react-email template migration · soft-bounce 3-strike
counter · handling the `email.suppressed` event · delivery analytics.
