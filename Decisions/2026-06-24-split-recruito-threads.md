# 2026-06-24 — Split the shared "Recruito" thread into private per-party channels

## Status
Accepted — implementing on branch `fix/messaging-split-recruito-threads`.

## Context
In-app messaging had two client-reported defects:

1. **"UNKNOWN" sender.** The live thread view + 5s poller load the conversation via
   `getCandidateConversation()` under the *user's* RLS, resolving sender names with a
   `sender:profiles(...)` join. When the company opened the Recruito thread, it could not
   read the *recruiter's* `profiles` row under RLS, so the sender label fell back to
   `t("common.unknown")`. (Other read paths — `getConversations`, admin — already resolve
   names via the service-role client; only this path was missed.)

2. **Company + recruiter share one Recruito thread.** `sendRecruitorMessage` seeded *both*
   the company and the recruiter as participants of a single `conversation_type='recruito'`
   row, making "Chat with Recruito" a 3-way room. Client wants these private.

A third reported symptom ("admin only shows latest message / overwrites history") was **not a
code bug** — the admin *list* view shows a one-line preview by design; the detail view
(`getRecruitoThreadForAdmin`) already fetches the full ordered thread. No storage bug exists
(message rows are distinct; `messageCount` is read straight from the DB).

## Decision
Split `conversation_type` for the Recruito channel into two **private, single-human-party**
threads:

- `recruito_company`   — participants: `[companyUserId]` (+ admins via `is_admin()`)
- `recruito_recruiter` — participants: `[recruiterUserId]` (+ admins via `is_admin()`)

`'client'` (company ↔ recruiter) is unchanged.

### Why this model (vs. a `party_user_id` column)
The existing code already keys conversations by `(candidate_id, conversation_type)`. Adding two
type values stays inside that pattern (explicit > clever), keeps every thread strictly 2-party
(simplest RLS — **no policy change needed**, since RLS is participant-based and type-agnostic),
and gives the admin inbox a natural two-rows-per-candidate shape.

### Supporting decisions
- **No new RLS policies.** Separation is enforced purely by *which* participant we seed plus an
  explicit in-action authorization guard (service-role reads must re-check the caller). RLS for
  conversations/messages/participants is already participant-based (migrations 002/021).
- **`UNIQUE(candidate_id, conversation_type)`** added to make "one thread per (candidate,type)"
  a DB invariant (today the code tolerates duplicates with a `limit(2)`+warn hack). Existing
  duplicates are deduped in the same migration before the constraint is added.
- **Sender names resolved via service role** in `getCandidateConversation`, *after* an explicit
  participant/admin authorization check (prevents the IDOR that dropping RLS would otherwise open).
- **Admin replies target a specific party thread.** The admin inbox lists each Recruito thread
  with a party badge (Company / Recruiter); `sendAdminMessage` takes the target
  `conversation_type`. Symmetric with the human side, which already has tabs.
- **Polling left as-is** (Realtime is out of scope for this fix).

## Data migration (migration 060)
Production Recruito data is effectively empty (messaging was 100% broken until 2026-06-22), so
volume is trivial — but the migration is written to be correct regardless:

For each existing `conversation_type='recruito'` conversation C (candidate K):
1. Relabel C → `recruito_company`; remove the recruiter participant row (company stays).
2. Create C2 → `recruito_recruiter` for K with the recruiter as the sole participant.
3. Move recruiter-authored messages from C to C2.
4. Copy admin-authored (Recruito) messages from C into C2 (so the recruiter retains Recruito's
   replies); company-authored and admin-authored messages remain in C.
5. Verify message counts reconcile (company-side + recruiter-side == original + admin copies).

## Consequences
- Company and recruiter can no longer see each other's Recruito conversation.
- The "UNKNOWN" label disappears (names resolve via service role on every read path).
- One DB-enforced conversation per (candidate, type); the `limit(2)`/warn hack is removed.
- Migration 060 is **not** auto-applied to production — apply is a deliberate, separate step.
