-- 055_conversation_type.sql
--
-- Capture the `conversations.conversation_type` column in version control. It
-- already exists in the live database (it was added out-of-band and is NOT
-- present in any prior migration), so this migration is intentionally
-- idempotent: a no-op against production, but on a fresh rebuild it recreates
-- the column that messaging depends on.
--
-- getCandidateConversation(), sendMessage() and sendRecruitorMessage() all
-- filter conversations by (candidate_id, conversation_type) — without this
-- column a rebuilt database would break in-app messaging entirely.
--
-- Values in use: 'client'  (company <-> recruiter thread)
--                'recruito' (human party <-> Recruito/admins thread)

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS conversation_type text NOT NULL DEFAULT 'client';

-- The per-candidate, per-type lookup is the hot path for the message actions.
CREATE INDEX IF NOT EXISTS idx_conversations_candidate_type
  ON public.conversations (candidate_id, conversation_type);

-- No GRANT needed: ALTER on an existing table; conversations already carries its
-- grants. RLS is unchanged — conversation creation is performed by the
-- service-role client in the message server actions, which enforce authorization
-- in code (sender must be the candidate's recruiter or company).
