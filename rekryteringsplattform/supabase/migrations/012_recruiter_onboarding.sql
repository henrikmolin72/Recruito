-- =============================================
-- RECRUITER ONBOARDING FIELDS
-- =============================================

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS current_country TEXT;

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS experience_bracket TEXT;

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS agreement_freelance_recruiter BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS agreement_commission_after_guarantee BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS primary_industries TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS primary_industries_other TEXT;

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS countries_experience TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS languages_spoken JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS seniority_focus TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS roles_per_week INTEGER;

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS candidates_sourced_last_12m INTEGER;

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS successful_placements_last_12m INTEGER;

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS average_time_to_fill TEXT;

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS challenging_role_example TEXT;

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS sourcing_channels TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS sourcing_channels_other TEXT;

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS available_hours_per_week TEXT;

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS onboarding_email_sent_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_recruiters_experience_bracket'
  ) THEN
    ALTER TABLE recruiters
    ADD CONSTRAINT chk_recruiters_experience_bracket
    CHECK (
      experience_bracket IS NULL OR experience_bracket IN ('0-1', '2-3', '4-6', '7-10', '10+')
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_recruiters_average_time_to_fill'
  ) THEN
    ALTER TABLE recruiters
    ADD CONSTRAINT chk_recruiters_average_time_to_fill
    CHECK (
      average_time_to_fill IS NULL OR average_time_to_fill IN ('<1 week', '1-2 weeks', '2-4 weeks', '1-2 months', '2+ months')
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_recruiters_available_hours_per_week'
  ) THEN
    ALTER TABLE recruiters
    ADD CONSTRAINT chk_recruiters_available_hours_per_week
    CHECK (
      available_hours_per_week IS NULL OR available_hours_per_week IN ('0-10', '10-20', '20-40', '40+')
    );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_recruiters_onboarding_completed
ON recruiters(onboarding_completed_at);
