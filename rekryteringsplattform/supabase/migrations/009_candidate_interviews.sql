-- =============================================
-- CANDIDATE INTERVIEWS (Interview rounds + event history)
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'interview_round_status'
  ) THEN
    CREATE TYPE interview_round_status AS ENUM (
      'requested',
      'proposed',
      'confirmed',
      'completed',
      'cancelled'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'interview_round_event_type'
  ) THEN
    CREATE TYPE interview_round_event_type AS ENUM (
      'requested',
      'time_proposed',
      'time_counter_proposed',
      'confirmed',
      'cancelled',
      'completed'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS candidate_interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  pipeline_stage_id TEXT,
  status interview_round_status NOT NULL DEFAULT 'requested',

  requested_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  requested_by_role user_role NOT NULL,
  last_actor_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  last_actor_role user_role,

  proposed_start_at TIMESTAMPTZ,
  proposed_end_at TIMESTAMPTZ,
  timezone TEXT,
  meeting_mode TEXT CHECK (meeting_mode IN ('video', 'phone', 'onsite')),
  meeting_link TEXT,
  location TEXT,

  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_candidate_interviews_round_positive CHECK (round_number > 0),
  CONSTRAINT chk_candidate_interviews_time_window CHECK (
    proposed_start_at IS NULL
    OR proposed_end_at IS NULL
    OR proposed_end_at > proposed_start_at
  )
);

CREATE TABLE IF NOT EXISTS candidate_interview_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID NOT NULL REFERENCES candidate_interviews(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  event_type interview_round_event_type NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  actor_role user_role NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_interviews_candidate_round_unique
ON candidate_interviews(candidate_id, round_number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_interviews_one_active_round
ON candidate_interviews(candidate_id)
WHERE status IN ('requested', 'proposed', 'confirmed');

CREATE INDEX IF NOT EXISTS idx_candidate_interviews_candidate
ON candidate_interviews(candidate_id);

CREATE INDEX IF NOT EXISTS idx_candidate_interviews_job
ON candidate_interviews(job_id);

CREATE INDEX IF NOT EXISTS idx_candidate_interviews_status
ON candidate_interviews(status);

CREATE INDEX IF NOT EXISTS idx_candidate_interview_events_interview_created_at
ON candidate_interview_events(interview_id, created_at);

CREATE INDEX IF NOT EXISTS idx_candidate_interview_events_candidate_created_at
ON candidate_interview_events(candidate_id, created_at);

DROP TRIGGER IF EXISTS set_updated_at ON candidate_interviews;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON candidate_interviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- RLS
-- =============================================

ALTER TABLE candidate_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_interview_events ENABLE ROW LEVEL SECURITY;

-- Candidate interview rounds are visible to the job owner company user and the presenting recruiter.
CREATE POLICY "Interview rounds visible to involved parties"
  ON candidate_interviews FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM candidates c
      JOIN jobs j ON j.id = c.job_id
      WHERE c.id = candidate_interviews.candidate_id
        AND (
          c.recruiter_id = get_recruiter_id()
          OR j.company_id = get_company_id()
          OR is_admin()
        )
    )
  );

CREATE POLICY "Interview rounds insert by involved parties"
  ON candidate_interviews FOR INSERT WITH CHECK (
    requested_by_user_id = auth.uid()
    AND requested_by_role = auth_role()
    AND EXISTS (
      SELECT 1
      FROM candidates c
      JOIN jobs j ON j.id = c.job_id
      WHERE c.id = candidate_interviews.candidate_id
        AND c.job_id = candidate_interviews.job_id
        AND (
          c.recruiter_id = get_recruiter_id()
          OR j.company_id = get_company_id()
          OR is_admin()
        )
    )
  );

CREATE POLICY "Interview rounds update by involved parties"
  ON candidate_interviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM candidates c
      JOIN jobs j ON j.id = c.job_id
      WHERE c.id = candidate_interviews.candidate_id
        AND (
          c.recruiter_id = get_recruiter_id()
          OR j.company_id = get_company_id()
          OR is_admin()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM candidates c
      JOIN jobs j ON j.id = c.job_id
      WHERE c.id = candidate_interviews.candidate_id
        AND c.job_id = candidate_interviews.job_id
        AND (
          c.recruiter_id = get_recruiter_id()
          OR j.company_id = get_company_id()
          OR is_admin()
        )
    )
  );

CREATE POLICY "Interview events visible to involved parties"
  ON candidate_interview_events FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM candidate_interviews ci
      JOIN candidates c ON c.id = ci.candidate_id
      JOIN jobs j ON j.id = c.job_id
      WHERE ci.id = candidate_interview_events.interview_id
        AND (
          c.recruiter_id = get_recruiter_id()
          OR j.company_id = get_company_id()
          OR is_admin()
        )
    )
  );

CREATE POLICY "Interview events insert by involved parties"
  ON candidate_interview_events FOR INSERT WITH CHECK (
    actor_user_id = auth.uid()
    AND actor_role = auth_role()
    AND EXISTS (
      SELECT 1
      FROM candidate_interviews ci
      JOIN candidates c ON c.id = ci.candidate_id
      JOIN jobs j ON j.id = c.job_id
      WHERE ci.id = candidate_interview_events.interview_id
        AND c.id = candidate_interview_events.candidate_id
        AND (
          c.recruiter_id = get_recruiter_id()
          OR j.company_id = get_company_id()
          OR is_admin()
        )
    )
  );
