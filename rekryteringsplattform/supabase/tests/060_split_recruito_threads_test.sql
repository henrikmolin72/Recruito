-- 060_split_recruito_threads_test.sql
--
-- Self-contained verification for migration 060 (split shared 'recruito' thread
-- into private 'recruito_company' / 'recruito_recruiter' threads).
--
-- This is a MANUAL / LOCAL verification, NOT wired into CI. There is no SQL test
-- harness in this repo (package.json `test` is vitest for the Next.js app; there
-- are no *.test.sql files and no pgTAP). Run it against a database that already
-- has migrations 001..059 applied (e.g. a local `supabase db reset`), with the
-- 'recruito' conversation_type still present (i.e. BEFORE 060 has run):
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/060_split_recruito_threads_test.sql
--
-- It seeds a shared 'recruito' conversation with a company message, a recruiter
-- message and an admin message, runs the EXACT split logic from migration 060,
-- asserts the post-conditions via RAISE, prints "TEST PASSED", then ROLLBACKs so
-- it leaves no trace. Any failed assertion RAISEs EXCEPTION and aborts.
--
-- ⚠️ DRIFT WARNING: the STEP 4 split SQL below ("RUN THE SPLIT") is DUPLICATED
-- from migration 060's STEP 4 — it is NOT imported. If you change STEP 4 in the
-- migration (any of 4a–4f), you MUST update the copy here in lockstep, or this
-- test will silently validate stale logic. The two blocks must stay identical.

BEGIN;

-- ---------------------------------------------------------------------------
-- SEED: three auth users + profiles (company, recruiter, admin), a recruiter,
-- a candidate owned by that recruiter, and one shared 'recruito' conversation
-- with the company + recruiter as participants and three messages.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  company_uid  uuid := gen_random_uuid();
  recr_uid     uuid := gen_random_uuid();
  admin_uid    uuid := gen_random_uuid();
  company_id   uuid;
  recruiter_id uuid;
  job_id       uuid;
  mandate_id   uuid;
  candidate_id uuid := gen_random_uuid();
  conv_id      uuid := gen_random_uuid();
  norecr_conv_id uuid := gen_random_uuid();
BEGIN
  -- auth.users rows are required because profiles.id FKs auth.users(id).
  INSERT INTO auth.users (id, email) VALUES
    (company_uid, 'test-company@example.test'),
    (recr_uid,    'test-recruiter@example.test'),
    (admin_uid,   'test-admin@example.test');

  INSERT INTO public.profiles (id, role, email, full_name) VALUES
    (company_uid, 'company',   'test-company@example.test',   'Test Company'),
    (recr_uid,    'recruiter', 'test-recruiter@example.test', 'Test Recruiter'),
    (admin_uid,   'admin',     'test-admin@example.test',     'Test Admin');

  -- candidates requires job_id + mandate_id (both NOT NULL FKs), so build the
  -- full dependency chain: company -> job -> recruiter -> mandate -> candidate.
  INSERT INTO public.companies (user_id, company_name)
  VALUES (company_uid, 'Test Co') RETURNING id INTO company_id;

  INSERT INTO public.jobs (company_id, title, description, industry, location)
  VALUES (company_id, 'Test Job', 'desc', 'Tech', 'Stockholm')
  RETURNING id INTO job_id;

  INSERT INTO public.recruiters (user_id) VALUES (recr_uid)
  RETURNING id INTO recruiter_id;

  INSERT INTO public.job_mandates (job_id, recruiter_id)
  VALUES (job_id, recruiter_id) RETURNING id INTO mandate_id;

  -- Candidate owned by the recruiter; the split resolves the recruiter via
  -- candidates.recruiter_id -> recruiters.user_id.
  INSERT INTO public.candidates (id, job_id, recruiter_id, mandate_id, first_name, last_name, email)
  VALUES (candidate_id, job_id, recruiter_id, mandate_id, 'Cand', 'Idate', 'cand@example.test');

  INSERT INTO public.conversations (id, candidate_id, conversation_type)
  VALUES (conv_id, candidate_id, 'recruito');

  INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES
    (conv_id, company_uid),
    (conv_id, recr_uid);

  INSERT INTO public.messages (conversation_id, sender_id, content) VALUES
    (conv_id, company_uid, 'company message'),
    (conv_id, recr_uid,    'recruiter message'),
    (conv_id, admin_uid,   'admin message');

  -- ---------------------------------------------------------------------------
  -- SEED 2: the STEP 4f "no recruiter resolves" branch. The split resolves the
  -- recruiter via the conversation's candidate -> recruiter chain. candidates
  -- (and recruiters.user_id) are NOT NULL, so the schema-valid way to make the
  -- migration's LEFT JOINs yield a NULL recruiter_user_id is a legacy
  -- 'recruito' conversation with candidate_id IS NULL. STEP 4f must relabel it
  -- to 'recruito_company' and create NO 'recruito_recruiter' thread.
  -- ---------------------------------------------------------------------------
  INSERT INTO public.conversations (id, candidate_id, conversation_type)
  VALUES (norecr_conv_id, NULL, 'recruito');

  INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES
    (norecr_conv_id, company_uid);

  INSERT INTO public.messages (conversation_id, sender_id, content) VALUES
    (norecr_conv_id, company_uid, 'norecr company message');

  -- Stash the ids so the split + assertions below can find them.
  CREATE TEMP TABLE _t (
    company_uid uuid, recr_uid uuid, admin_uid uuid,
    candidate_id uuid, company_conv_id uuid, norecr_conv_id uuid
  ) ON COMMIT DROP;
  INSERT INTO _t VALUES (company_uid, recr_uid, admin_uid, candidate_id, conv_id, norecr_conv_id);
END $$;

-- ---------------------------------------------------------------------------
-- RUN THE SPLIT (mirrors migration 060 STEP 4, scoped to the seeded candidate).
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _recruito_split ON COMMIT DROP AS
SELECT
  c.id              AS company_conv_id,
  c.candidate_id    AS candidate_id,
  c.job_id          AS job_id,
  r.user_id         AS recruiter_user_id,
  gen_random_uuid() AS recruiter_conv_id
FROM public.conversations c
LEFT JOIN public.candidates cand ON cand.id = c.candidate_id
LEFT JOIN public.recruiters r    ON r.id = cand.recruiter_id
WHERE c.conversation_type = 'recruito';

INSERT INTO public.conversations (id, job_id, candidate_id, conversation_type, created_at)
SELECT s.recruiter_conv_id, s.job_id, s.candidate_id, 'recruito_recruiter', NOW()
FROM _recruito_split s WHERE s.recruiter_user_id IS NOT NULL;

INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT s.recruiter_conv_id, s.recruiter_user_id
FROM _recruito_split s WHERE s.recruiter_user_id IS NOT NULL;

UPDATE public.messages m
SET conversation_id = s.recruiter_conv_id
FROM _recruito_split s
WHERE m.conversation_id = s.company_conv_id
  AND s.recruiter_user_id IS NOT NULL
  AND m.sender_id = s.recruiter_user_id;

INSERT INTO public.messages (conversation_id, sender_id, content, is_system_message, created_at)
SELECT s.recruiter_conv_id, m.sender_id, m.content, m.is_system_message, m.created_at
FROM _recruito_split s
JOIN public.messages m ON m.conversation_id = s.company_conv_id
JOIN public.profiles p ON p.id = m.sender_id
WHERE s.recruiter_user_id IS NOT NULL
  AND p.role = 'admin'
  AND m.sender_id <> s.recruiter_user_id;

DELETE FROM public.conversation_participants cp
USING _recruito_split s
WHERE cp.conversation_id = s.company_conv_id
  AND s.recruiter_user_id IS NOT NULL
  AND cp.user_id = s.recruiter_user_id;

UPDATE public.conversations c
SET conversation_type = 'recruito_company'
FROM _recruito_split s
WHERE c.id = s.company_conv_id;

-- ---------------------------------------------------------------------------
-- ASSERTIONS
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t              _t%ROWTYPE;
  recr_conv_id   uuid;
  n              int;
BEGIN
  SELECT * INTO t FROM _t;

  -- No 'recruito' rows remain anywhere.
  SELECT count(*) INTO n FROM public.conversations WHERE conversation_type = 'recruito';
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: % recruito rows remain', n; END IF;

  -- The original conversation is now 'recruito_company'.
  SELECT count(*) INTO n FROM public.conversations
  WHERE id = t.company_conv_id AND conversation_type = 'recruito_company';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: original conv not relabelled to recruito_company'; END IF;

  -- Exactly one recruiter thread exists for this candidate.
  SELECT id INTO recr_conv_id FROM public.conversations
  WHERE candidate_id = t.candidate_id AND conversation_type = 'recruito_recruiter';
  IF recr_conv_id IS NULL THEN RAISE EXCEPTION 'FAIL: no recruiter thread created'; END IF;

  -- Company thread: company participant only (single human, non-admin).
  SELECT count(*) INTO n FROM public.conversation_participants
  WHERE conversation_id = t.company_conv_id;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: company thread has % participants (want 1)', n; END IF;
  PERFORM 1 FROM public.conversation_participants
  WHERE conversation_id = t.company_conv_id AND user_id = t.company_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: company thread missing company participant'; END IF;

  -- Recruiter thread: recruiter participant only.
  SELECT count(*) INTO n FROM public.conversation_participants
  WHERE conversation_id = recr_conv_id;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: recruiter thread has % participants (want 1)', n; END IF;
  PERFORM 1 FROM public.conversation_participants
  WHERE conversation_id = recr_conv_id AND user_id = t.recr_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: recruiter thread missing recruiter participant'; END IF;

  -- Company thread messages: company message + admin message (admin stays), no
  -- recruiter message. 2 rows.
  SELECT count(*) INTO n FROM public.messages WHERE conversation_id = t.company_conv_id;
  IF n <> 2 THEN RAISE EXCEPTION 'FAIL: company thread has % messages (want 2)', n; END IF;
  PERFORM 1 FROM public.messages WHERE conversation_id = t.company_conv_id AND content = 'company message';
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: company thread missing company message'; END IF;
  PERFORM 1 FROM public.messages WHERE conversation_id = t.company_conv_id AND content = 'admin message';
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: company thread missing admin message'; END IF;
  PERFORM 1 FROM public.messages WHERE conversation_id = t.company_conv_id AND content = 'recruiter message';
  IF FOUND THEN RAISE EXCEPTION 'FAIL: recruiter message should have left the company thread'; END IF;

  -- Recruiter thread messages: recruiter message (moved) + admin message (copy).
  SELECT count(*) INTO n FROM public.messages WHERE conversation_id = recr_conv_id;
  IF n <> 2 THEN RAISE EXCEPTION 'FAIL: recruiter thread has % messages (want 2)', n; END IF;
  PERFORM 1 FROM public.messages WHERE conversation_id = recr_conv_id AND content = 'recruiter message';
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: recruiter thread missing recruiter message'; END IF;
  PERFORM 1 FROM public.messages WHERE conversation_id = recr_conv_id AND content = 'admin message';
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: recruiter thread missing admin message copy'; END IF;

  -- Admin message now exists in BOTH threads (original + copy) => 2 globally.
  SELECT count(*) INTO n FROM public.messages WHERE content = 'admin message';
  IF n <> 2 THEN RAISE EXCEPTION 'FAIL: admin message count is % (want 2: original + copy)', n; END IF;

  -- STEP 4f (no recruiter resolves): the candidate-less 'recruito' conversation
  -- must be relabelled to 'recruito_company' in place, with NO recruiter thread.
  SELECT count(*) INTO n FROM public.conversations
  WHERE id = t.norecr_conv_id AND conversation_type = 'recruito_company';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: 4f conv not relabelled to recruito_company'; END IF;

  -- No 'recruito_recruiter' thread was created for the candidate-less branch.
  -- Such a thread (if any) would carry the same NULL candidate_id; assert none
  -- exists, and that the only recruiter thread is the seeded candidate's one.
  SELECT count(*) INTO n FROM public.conversations
  WHERE conversation_type = 'recruito_recruiter' AND candidate_id IS NULL;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: 4f branch created % recruito_recruiter thread(s) (want 0)', n; END IF;

  SELECT count(*) INTO n FROM public.conversations
  WHERE conversation_type = 'recruito_recruiter';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: expected exactly 1 recruito_recruiter thread total, got %', n; END IF;

  -- The 4f company thread keeps its single company participant, no recruiter added.
  SELECT count(*) INTO n FROM public.conversation_participants
  WHERE conversation_id = t.norecr_conv_id;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: 4f thread has % participants (want 1)', n; END IF;
  PERFORM 1 FROM public.conversation_participants
  WHERE conversation_id = t.norecr_conv_id AND user_id = t.company_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: 4f thread missing company participant'; END IF;

  RAISE NOTICE 'TEST PASSED: recruito split is correct';
END $$;

ROLLBACK;
