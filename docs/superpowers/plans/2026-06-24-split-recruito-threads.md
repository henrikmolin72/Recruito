# Execution Plan — Split Recruito threads + fix UNKNOWN sender

Branch: `fix/messaging-split-recruito-threads`. App dir: `rekryteringsplattform/`.
ADR: `Decisions/2026-06-24-split-recruito-threads.md`.

Decisions: Arch1=A (split recruito → recruito_company/recruito_recruiter), Arch2=A (UNIQUE
+ idempotent upsert), Arch3=A (service-role sender names), Arch4=C (defer polling),
CQ1=A (extract getOrCreateConversation), CQ2=A (explicit IDOR guard), CQ3=A (drop client sort),
CQ4=B (extract firstOf helper; error-string i18n deferred).

RLS NOTE: conversations/messages/conversation_participants RLS is participant-based and
type-agnostic (migrations 002 & 021). New conversation_type values need NO new RLS policies.
Separation comes from seeding only the correct single party as participant.

Gate per task: `npm run build` passes in rekryteringsplattform/; reproducing test red before fix;
security-adjacent changes checked against CLAUDE.md §6 (auth, IDOR, error leakage).

---

## Task 1 — Migration 060: schema + data split (no RLS changes)

Create `rekryteringsplattform/supabase/migrations/060_split_recruito_threads.sql`.

Requirements:
1. Idempotent and safe to run on a fresh rebuild AND against production.
2. Dedupe any pre-existing duplicate conversations on (candidate_id, conversation_type):
   keep the oldest row, repoint its messages + participants, delete the rest — BEFORE adding
   the constraint. Run this for ALL types, not just recruito.
3. Add `UNIQUE (candidate_id, conversation_type)` constraint (or unique index) on
   public.conversations. candidate_id may be NULL for some legacy rows — use a unique index
   that still permits NULL candidate_id rows (Postgres treats NULLs as distinct, which is fine).
4. Data split for each existing conversation_type='recruito' row C (candidate K):
   a. Create C2 with conversation_type='recruito_recruiter', same candidate_id/job_id.
   b. Insert a conversation_participants row for C2 = the recruiter's user_id. Resolve the
      recruiter via candidates.recruiter_id -> recruiters.user_id.
   c. Relabel C -> 'recruito_company'. Delete C's conversation_participants row for the
      recruiter's user_id (company participant stays).
   d. Reassign recruiter-authored messages (messages.sender_id = recruiter user_id) from C to C2.
   e. Copy admin-authored messages (sender_id belongs to a profile with role='admin') from C
      into C2 as new rows (INSERT ... SELECT, new ids, same content/created_at/sender_id).
   f. If the recruiter cannot be resolved (no recruiter_id), leave C as 'recruito_company' and
      create no C2 — do not fail the migration.
5. Keep idx_conversations_candidate_type (already exists from 055).
6. No GRANT needed (no new tables; ALTER only). Add a comment block explaining the RLS-is-
   participant-based reasoning and that this migration is NOT auto-applied to prod.

Verification (include as comments or a DO block that RAISES on mismatch in a transaction the
implementer runs locally): after the split, no conversation_type='recruito' rows remain; every
recruito_company/recruito_recruiter conversation has exactly one human participant.

TEST: Add a SQL-level or integration test under the repo's existing test setup that loads a
seeded shared recruito conversation (company msg + recruiter msg + admin msg) and asserts the
split result: company thread has company+admin msgs, recruiter thread has recruiter+admin msgs,
participants are single-party. If no SQL test harness exists, write a focused integration test
using the service-role client against a local/branch DB; if neither is feasible in CI, document
the manual verification query in the migration and state that clearly.

DO NOT apply the migration to production.

---

## Task 2 — Server actions: messages.ts

File: `rekryteringsplattform/src/lib/actions/messages.ts`.

1. Extract `firstOf<T>(rel: T | T[] | null | undefined): T | undefined` (CQ4) and replace the
   hand-rolled `Array.isArray(x) ? x[0] : x` unwraps in this file.
2. Extract `getOrCreateConversation({ candidateId, conversationType, jobId, participantUserIds })`
   that: looks up the conversation by (candidate_id, conversation_type) via service role;
   creates it idempotently if missing (rely on the new UNIQUE constraint — on conflict, re-select
   the existing row rather than erroring on a race); upserts the given participant rows with
   onConflict 'conversation_id,user_id' ignoreDuplicates. Returns { id }. Remove the old
   limit(2)+warn duplicate-tolerance hack — the constraint makes it dead code.
3. Rework `sendRecruitorMessage(candidateId, jobId, content)`: keep the IDOR auth (sender must be
   the candidate's recruiter or company). Determine the sender's side; route to
   conversation_type 'recruito_company' (if sender is the company) or 'recruito_recruiter' (if
   sender is the recruiter). Seed ONLY the sender's own user_id as participant (single-party,
   private). Insert the message. This is the privacy fix.
4. Rework `getCandidateConversation(candidateId, conversationType)`:
   - Accept conversationType values 'client' | 'recruito_company' | 'recruito_recruiter'.
   - Add an explicit authorization guard (CQ2 / IDOR): the caller (auth.uid()) must be a
     participant of the resolved conversation OR an admin (is_admin via profiles role check).
     Reuse the candidate->recruiter/company resolution already used in sendMessage.
   - Resolve sender names via the SERVICE-ROLE client (Arch3): fetch messages, then batch-fetch
     profiles for sender_ids via admin client and attach { full_name, role }. This removes the
     RLS-blocked profile join that produced "UNKNOWN".
   - Return the same shape the client expects (messages[] with sender objects).
5. `sendMessage` (client thread): only adopt the shared getOrCreateConversation + firstOf; do not
   change its client-thread semantics or routing. placements.ts is NOT touched.

Constraint: this is the load-bearing security file. Map any raw Supabase errors to generic
messages (no schema leakage). Run `npm run build`.

TEST (red first): add a unit/integration test asserting (a) a company recruito message lands in
a 'recruito_company' conversation whose only participant is the company; (b) a recruiter recruito
message lands in 'recruito_recruiter' with only the recruiter; (c) getCandidateConversation
resolves sender full_name for a message authored by the *other* role (no "Unknown"); (d) a user
who is neither participant nor admin gets null/denied from getCandidateConversation (IDOR guard).

---

## Task 3 — Admin actions + admin UI: per-party Recruito threads

Files: `rekryteringsplattform/src/lib/actions/admin-messages.ts` and the admin messages pages
(`src/app/(dashboard)/admin/messages/page.tsx`, `.../admin/messages/[candidateId]/...`).

1. `getRecruitoConversationsForAdmin`: now query conversation_type IN
   ('recruito_company','recruito_recruiter'). Return one row PER conversation (so a candidate
   can appear twice) including a `party: 'company' | 'recruiter'` field and the resolved party
   name. Keep newest-activity-first sorting.
2. `getRecruitoThreadForAdmin`: accept the target conversation_type (or a party arg) so it loads
   the specific party thread. Keep service-role sender-name resolution. Use firstOf if useful.
3. `sendAdminMessage(candidateId, jobId, content, conversationType)`: add the target
   conversation_type param ('recruito_company' | 'recruito_recruiter'); create that party thread
   if missing (single-party participant = that party's user_id) and insert. Notify only that
   party (company OR recruiter), not both.
4. Admin pages: list shows a party badge; the detail route loads/repls into the chosen party
   thread. Keep requireAdmin() gating. Add i18n keys in EVERY dictionary under
   src/i18n/dictionaries/ for any new UI strings (CLAUDE.md: build fails otherwise).

Run `npm run build`. TEST: assert getRecruitoConversationsForAdmin returns separate company/
recruiter rows for a candidate that has both threads; sendAdminMessage targets the correct thread.

---

## Task 4 — Candidate page wiring + client component

Files: `src/app/(dashboard)/company/jobs/[id]/candidates/[candidateId]/page.tsx`,
`src/app/(dashboard)/recruiter/mandates/[id]/candidates/[candidateId]/page.tsx`,
`src/components/shared/candidate-chat.tsx`, `src/components/shared/tabbed-candidate-chat.tsx`.

1. Company candidate page: load the recruito tab from conversation_type 'recruito_company'.
   Recruiter candidate page: load from 'recruito_recruiter'. (Both currently pass 'recruito'.)
2. TabbedCandidateChat: the recruito tab must pass the correct conversationType down to
   CandidateChat so the 5s poller calls getCandidateConversation with the right type. Today it
   hardcodes 'recruito' — make it a prop or branch per page.
3. candidate-chat.tsx: drop the in-render `messages.sort(...)` state mutation (CQ3) — the server
   already returns ordered messages. If a defensive sort is kept, copy first ([...messages]).
4. Confirm sender names now render (Task 2 fix) and "UNKNOWN" no longer appears for cross-role
   messages in the (now private) threads.

Run `npm run build`. TEST: component-level or e2e assertion that the recruito tab on each page
requests the correct conversation_type and renders resolved sender names.

---

## Task 5 — E2E verification

Add a Playwright e2e (repo has e2e CI scaffolding — see Dev-Notes/e2e-ci-secrets-setup.md) that:
1. Company posts a Recruito message; recruiter posts a Recruito message (same candidate).
2. Asserts the company CANNOT see the recruiter's Recruito message and vice-versa (privacy).
3. Asserts every visible sender label resolves to a name — never "Unknown"/"Okänd".
4. Admin sees BOTH party threads and can reply into each; reply lands in the correct thread only.

If full e2e infra isn't runnable here, write the spec, wire it into the existing e2e suite, and
clearly state in the handoff what was executed vs. what needs the CI secrets to run.

---

## Final
After all tasks: full code review of the whole diff, `npm run build` green, summarize verification
evidence, and note that migration 060 must be applied to production as a separate deliberate step.
