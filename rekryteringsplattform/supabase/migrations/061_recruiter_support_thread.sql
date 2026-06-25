-- 061_recruiter_support_thread.sql
-- Candidate-independent recruiter <-> Recruito (admin) support threads.
--
-- Today every conversation is keyed by candidate_id, so a recruiter cannot
-- reach Recruito until they have a candidate. This adds owner_user_id so a
-- conversation can be keyed to a USER instead of a candidate, plus a partial
-- UNIQUE index so each owner has at most one candidate-less thread per type.
-- (The existing UNIQUE(candidate_id, conversation_type) treats NULLs as
-- distinct, so it cannot enforce one-thread-per-recruiter on its own.)
--
-- conversation_type is free TEXT; the new value 'recruito_recruiter_general'
-- needs no enum change. This is an ALTER on an existing table, so no new GRANT
-- is required (conversations already grants the app roles via earlier migrations).
--
-- Idempotent: safe to re-run during deploy overlap.

ALTER TABLE public.conversations
    ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- One candidate-less thread per (owner, type). Scoped to owner_user_id IS NOT NULL
-- so it never collides with the candidate-keyed rows (which leave owner NULL).
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_owner_type_no_candidate
    ON public.conversations (owner_user_id, conversation_type)
    WHERE candidate_id IS NULL AND owner_user_id IS NOT NULL;
