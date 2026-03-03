-- =============================================
-- 020 – Candidate Submission Extended Fields
-- Adds all new columns required for the full
-- 6-section candidate submission form
-- =============================================

-- Section 1 – Candidate Verification
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Section 2 – Personal Details
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS location_city TEXT,
  ADD COLUMN IF NOT EXISTS location_country TEXT,
  ADD COLUMN IF NOT EXISTS location_status TEXT, -- 'on_site' | 'willing_to_relocate' | 'fully_remote'
  ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
  ADD COLUMN IF NOT EXISTS work_authorization TEXT, -- 'eu_citizen' | 'permanent_resident' | 'valid_work_permit' | 'requires_visa' | 'not_authorized'
  ADD COLUMN IF NOT EXISTS ai_match_score INTEGER; -- 0-100

-- Section 3 – Employment Status
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS employment_status TEXT, -- 'employed' | 'not_employed'
  ADD COLUMN IF NOT EXISTS employment_status_reason TEXT, -- reason for leaving / motivation
  ADD COLUMN IF NOT EXISTS other_processes BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS other_processes_stage TEXT; -- 'initial_screening' | 'interview' | 'final_interview' | 'offer_received'

-- Section 4 – Compensation & Availability
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS current_salary INTEGER,
  ADD COLUMN IF NOT EXISTS current_salary_currency TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS current_benefits TEXT,
  ADD COLUMN IF NOT EXISTS desired_salary INTEGER,
  ADD COLUMN IF NOT EXISTS desired_salary_currency TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS desired_benefits TEXT,
  ADD COLUMN IF NOT EXISTS notice_period TEXT, -- 'immediately' | '2_weeks' | '1_month' | '2_months' | '3_months'
  ADD COLUMN IF NOT EXISTS notice_negotiable BOOLEAN DEFAULT FALSE;

-- Section 5 – Screening & Interview Notes
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS first_contact_date DATE,
  ADD COLUMN IF NOT EXISTS contact_method TEXT, -- 'in_person' | 'video_call' | 'phone' | 'email' | 'messaging'
  ADD COLUMN IF NOT EXISTS screening_answers JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS language_proficiency JSONB DEFAULT '[]'::jsonb;

-- Section 6 – Assessment
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS assessment_summary TEXT,
  ADD COLUMN IF NOT EXISTS recruiter_declaration BOOLEAN DEFAULT FALSE;
