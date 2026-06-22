---
title: Create conversations via service role (messaging RLS chicken-and-egg)
date: 2026-06-22
status: accepted
---

# Context

In-app messaging was **completely non-functional** — production had **0
conversations and 0 messages** ever. A client reported that sending a message on
the company "Chat with Recruiter" tab flashed the message then dropped it back
into the input (and the recruiter never received it, no history).

Root cause: the `conversations` SELECT RLS policy ("Participants can view
conversations", migration 021) only exposes a row to users already in
`conversation_participants`. But the send actions create the conversation, *then*
add participants. So `supabase.from("conversations").insert(...).select().single()`
(RLS-scoped) could never read back the row it just created → the action errored on
every first message. `sendMessage` also omitted `conversation_type`, and
`sendRecruitorMessage` never created participant rows at all.

This is **not** related to the unimplemented Resend/email work — messaging is
entirely in-app/DB; there is no email code in the path.

# Decision

Conversation **creation** and **participant seeding** are performed with the
**service-role** client in the message server actions (`sendMessage`,
`sendRecruitorMessage`); the actual message INSERT stays RLS-scoped (the sender is
a participant by then, so the messages INSERT policy passes). Both actions enforce
authorization in code first: the sender must be the candidate's recruiter or
company (IDOR guard — mandatory because service role bypasses RLS).

`conversation_type` is now set explicitly (`'client'` / `'recruito'`) and the
per-candidate lookups filter on it. Migration `055` captures the
`conversation_type` column, which existed in the live DB but in no migration
(drift) — a rebuild would otherwise break messaging.

# Alternatives rejected

- **Loosen the `conversations` SELECT policy** to let creators read their row:
  weakens RLS for all readers and still needs participants for the messages
  policy. Service-role creation is narrower and keeps RLS intact for reads.

# Consequences

- First messages now persist; both `client` and `recruito` threads work.
- Service-role writes mean the in-code ownership check is load-bearing — do not
  remove it. See `src/lib/actions/messages.ts`.
- Runtime RLS behavior is not covered by the (pure unit) vitest suite; a Playwright
  E2E using the existing `E2E_COMPANY_*` creds is the right regression guard.
