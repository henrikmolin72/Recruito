-- 060_split_recruito_threads.sql
--
-- Split the single shared `conversation_type = 'recruito'` thread (which mixed
-- the company, the recruiter and Recruito/admins into one conversation) into
-- two PRIVATE per-party threads:
--
--   'recruito_company'    — the company's private thread with Recruito/admins
--   'recruito_recruiter'  — the recruiter's private thread with Recruito/admins
--
-- Rationale lives in Decisions/2026-06-24-split-recruito-threads.md.
--
-- WHY NO RLS CHANGES ARE NEEDED
-- -----------------------------
-- RLS on conversations / conversation_participants / messages is PARTICIPANT-
-- based and entirely TYPE-AGNOSTIC. Verified against:
--   * 002_rls_policies.sql            — "Participants can view conversations"
--                                       gates on conversation_participants.user_id
--                                       = auth.uid(); messages gate on membership.
--   * 021_fix_all_supabase_lint_issues.sql — re-stated the same participant-based
--                                       policies (optimized form). No policy
--                                       references conversation_type.
-- Because privacy is enforced by who is a participant — not by the type string —
-- creating new typed conversations and moving participants is sufficient to make
-- each thread private. No policy edits are required.
--
-- WHY NO GRANT IS NEEDED
-- ----------------------
-- This migration only ALTERs the existing public.conversations table (adds a
-- unique index) and performs DML. It creates no new tables, so the Recruito
-- "new public.* table needs an explicit GRANT" rule does not apply. The message
-- server actions create conversations via the service-role client regardless.
--
-- DEPLOYMENT NOTE
-- ---------------
-- This migration is NOT auto-applied to production; apply it manually.
--
-- RECOMMENDED ROLLOUT ORDER:
--   1. Apply migration 060 to the database FIRST (it splits existing `recruito`
--      rows into `recruito_company`/`recruito_recruiter` and adds the
--      UNIQUE(candidate_id, conversation_type) index). This is safe while the OLD
--      code is still live: old code only ever writes the legacy
--      `conversation_type='recruito'`, which this migration is built to re-split.
--   2. Deploy the new application code (which reads/writes the per-party types).
--   3. RE-RUN migration 060 once more (it is idempotent) to mop up any legacy
--      `recruito` rows the old code may have created during the deploy overlap
--      window.
--
-- Rationale: applying the migration first means existing Recruito threads are
-- split immediately (no window where users see empty per-party tabs), and the
-- idempotent re-run cleans up the brief old-code/new-code overlap. Production
-- `recruito` data is effectively empty (in-app messaging was broken until
-- 2026-06-22), so impact is minimal either way, but this order is the safest.

BEGIN;

-- ---------------------------------------------------------------------------
-- STEP 1 (idempotency guard): if the split has already run, there will be no
-- 'recruito' rows left and the unique index will exist. Each statement below is
-- individually idempotent, so a re-run is a safe no-op.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- STEP 2: Dedupe pre-existing duplicate conversations on
-- (candidate_id, conversation_type) BEFORE adding the unique index, for ALL
-- types. Keep the OLDEST row per group; repoint its messages and participants
-- to the kept row; delete the duplicates.
--
-- candidate_id may be NULL for legacy rows. We intentionally only dedupe groups
-- where candidate_id IS NOT NULL: NULL candidate_id rows are treated as distinct
-- (matching the unique index's NULL-distinct semantics in step 3), so we never
-- collapse unrelated NULL-candidate conversations together.
-- ---------------------------------------------------------------------------

-- Map every duplicate conversation to the oldest "keeper" in its group.
CREATE TEMP TABLE _dupe_map ON COMMIT DROP AS
WITH ranked AS (
  SELECT
    id,
    candidate_id,
    conversation_type,
    first_value(id) OVER (
      PARTITION BY candidate_id, conversation_type
      ORDER BY created_at ASC, id ASC
    ) AS keep_id
  FROM public.conversations
  WHERE candidate_id IS NOT NULL
)
SELECT id AS dup_id, keep_id
FROM ranked
WHERE id <> keep_id;

-- Repoint messages from duplicates onto the keeper.
UPDATE public.messages m
SET conversation_id = d.keep_id
FROM _dupe_map d
WHERE m.conversation_id = d.dup_id;

-- Repoint participants from duplicates onto the keeper, skipping any that would
-- collide with an existing (keep_id, user_id) row (UNIQUE constraint).
UPDATE public.conversation_participants cp
SET conversation_id = d.keep_id
FROM _dupe_map d
WHERE cp.conversation_id = d.dup_id
  AND NOT EXISTS (
    SELECT 1 FROM public.conversation_participants cp2
    WHERE cp2.conversation_id = d.keep_id
      AND cp2.user_id = cp.user_id
  );

-- Any participant rows that still point at a duplicate are exact duplicates of a
-- keeper participant; drop them (they will also cascade when the dup conversation
-- is deleted, but delete explicitly for clarity).
DELETE FROM public.conversation_participants cp
USING _dupe_map d
WHERE cp.conversation_id = d.dup_id;

-- Delete the duplicate conversations (messages/participants already repointed or
-- removed; ON DELETE CASCADE mops up any stragglers).
DELETE FROM public.conversations c
USING _dupe_map d
WHERE c.id = d.dup_id;

-- ---------------------------------------------------------------------------
-- STEP 3: Add the UNIQUE index on (candidate_id, conversation_type).
-- Postgres treats NULLs as distinct, so multiple NULL-candidate rows are allowed
-- (acceptable for legacy data). Keep idx_conversations_candidate_type from
-- migration 055 — do NOT drop it (it is a non-unique lookup index on the same
-- columns and still serves the hot path).
-- ---------------------------------------------------------------------------
-- NOTE: built non-CONCURRENTLY. The conversations table is small enough that the
-- brief SHARE write-lock from a plain index build is acceptable; CONCURRENTLY
-- cannot run inside this transaction anyway. Reconsider if volume grows.
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_candidate_type
  ON public.conversations (candidate_id, conversation_type);

-- ---------------------------------------------------------------------------
-- STEP 4: Split each existing 'recruito' conversation into a company thread
-- (the relabelled original) and, when a recruiter can be resolved, a private
-- recruiter thread (a new conversation).
--
-- For each 'recruito' conversation C (candidate K = C.candidate_id):
--   a. Create C2 ('recruito_recruiter') with the same candidate_id and job_id.
--   b. Add a participant on C2 for the recruiter's user_id.
--   c. Relabel C -> 'recruito_company' and drop C's recruiter participant.
--   d. Reassign recruiter-authored messages from C to C2.
--   e. Copy admin-authored messages from C into C2 as NEW rows.
--   f. If no recruiter resolves, leave C as 'recruito_company', create no C2.
-- ---------------------------------------------------------------------------

-- Resolve, for every 'recruito' conversation, the recruiter's user_id (if any).
-- candidates.recruiter_id -> recruiters.id -> recruiters.user_id (a profiles.id).
CREATE TEMP TABLE _recruito_split ON COMMIT DROP AS
SELECT
  c.id            AS company_conv_id,   -- the original C (becomes recruito_company)
  c.candidate_id  AS candidate_id,
  c.job_id        AS job_id,
  r.user_id       AS recruiter_user_id, -- NULL when no recruiter can be resolved
  gen_random_uuid() AS recruiter_conv_id  -- pre-allocated id for C2
FROM public.conversations c
LEFT JOIN public.candidates cand ON cand.id = c.candidate_id
LEFT JOIN public.recruiters r    ON r.id = cand.recruiter_id
WHERE c.conversation_type = 'recruito';

-- 4a. Create the recruiter thread C2 (only when a recruiter resolves).
INSERT INTO public.conversations (id, job_id, candidate_id, conversation_type, created_at)
SELECT s.recruiter_conv_id, s.job_id, s.candidate_id, 'recruito_recruiter', NOW()
FROM _recruito_split s
WHERE s.recruiter_user_id IS NOT NULL;

-- 4b. Add the recruiter as the sole human participant on C2.
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT s.recruiter_conv_id, s.recruiter_user_id
FROM _recruito_split s
WHERE s.recruiter_user_id IS NOT NULL;

-- 4d. Reassign recruiter-authored messages from C to C2.
UPDATE public.messages m
SET conversation_id = s.recruiter_conv_id
FROM _recruito_split s
WHERE m.conversation_id = s.company_conv_id
  AND s.recruiter_user_id IS NOT NULL
  AND m.sender_id = s.recruiter_user_id;

-- 4e. Copy admin-authored messages from C into C2 as NEW rows. The admin thread
-- is shared context, so admins' messages must appear in BOTH threads. We exclude
-- the recruiter's own messages from this copy (they already moved in 4d), so a
-- recruiter who also happens to be an admin is not double-counted.
INSERT INTO public.messages (conversation_id, sender_id, content, is_system_message, created_at)
SELECT s.recruiter_conv_id, m.sender_id, m.content, m.is_system_message, m.created_at
FROM _recruito_split s
JOIN public.messages m ON m.conversation_id = s.company_conv_id
JOIN public.profiles p ON p.id = m.sender_id
WHERE s.recruiter_user_id IS NOT NULL
  AND p.role = 'admin'
  AND m.sender_id <> s.recruiter_user_id;

-- 4c (part 1). Drop C's recruiter participant (the company participant stays).
DELETE FROM public.conversation_participants cp
USING _recruito_split s
WHERE cp.conversation_id = s.company_conv_id
  AND s.recruiter_user_id IS NOT NULL
  AND cp.user_id = s.recruiter_user_id;

-- 4c (part 2). Relabel every original C -> 'recruito_company'. This also covers
-- step 4f: rows with no resolvable recruiter simply become company threads.
UPDATE public.conversations c
SET conversation_type = 'recruito_company'
FROM _recruito_split s
WHERE c.id = s.company_conv_id;

-- ---------------------------------------------------------------------------
-- STEP 7: Verification. Fail the migration (rollback) if the post-conditions do
-- not hold:
--   (1) Zero conversation_type = 'recruito' rows remain.
--   (2) Every recruito_company / recruito_recruiter conversation has at most one
--       HUMAN (non-admin) participant.
--   (3) Every recruito_company / recruito_recruiter conversation has AT LEAST one
--       HUMAN (non-admin) participant — no orphaned threads with zero humans.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  leftover_recruito INT;
  bad_party_count   INT;
  orphan_count      INT;
BEGIN
  SELECT count(*) INTO leftover_recruito
  FROM public.conversations
  WHERE conversation_type = 'recruito';

  IF leftover_recruito <> 0 THEN
    RAISE EXCEPTION 'Split failed: % conversation(s) still typed ''recruito''', leftover_recruito;
  END IF;

  SELECT count(*) INTO bad_party_count
  FROM (
    SELECT c.id
    FROM public.conversations c
    JOIN public.conversation_participants cp ON cp.conversation_id = c.id
    JOIN public.profiles p ON p.id = cp.user_id
    WHERE c.conversation_type IN ('recruito_company', 'recruito_recruiter')
      AND p.role <> 'admin'
    GROUP BY c.id
    HAVING count(*) > 1
  ) offenders;

  IF bad_party_count <> 0 THEN
    RAISE EXCEPTION 'Split failed: % recruito thread(s) have more than one non-admin participant', bad_party_count;
  END IF;

  -- Every recruito_company / recruito_recruiter thread must have AT LEAST one
  -- human (non-admin) participant; a thread with zero is an orphan. Scoped to
  -- these two types only — 'client' and other types are not subject to this rule.
  SELECT count(*) INTO orphan_count
  FROM public.conversations c
  WHERE c.conversation_type IN ('recruito_company', 'recruito_recruiter')
    AND NOT EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      JOIN public.profiles p ON p.id = cp.user_id
      WHERE cp.conversation_id = c.id
        AND p.role <> 'admin'
    );

  IF orphan_count <> 0 THEN
    RAISE EXCEPTION 'Split failed: % recruito thread(s) have zero non-admin (human) participants', orphan_count;
  END IF;
END $$;

COMMIT;
