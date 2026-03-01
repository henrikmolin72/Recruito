-- =============================================
-- 017: Expand jobs table with full spec fields
-- Company job posting: all fields from the spec
-- =============================================

-- Employment details
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contract_duration TEXT;

-- Structured location
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location_code TEXT;

-- Work type
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_type TEXT
  CHECK (work_type IS NULL OR work_type IN ('onsite', 'hybrid', 'remote'));
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS remote_type TEXT
  CHECK (remote_type IS NULL OR remote_type IN ('local', 'international'));

-- Work authorization
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_permit_accepted BOOLEAN;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS visa_sponsorship BOOLEAN;

-- Salary extended
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_gross_net TEXT
  CHECK (salary_gross_net IS NULL OR salary_gross_net IN ('gross', 'net'));
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_period TEXT
  CHECK (salary_period IS NULL OR salary_period IN ('monthly', 'yearly', 'hourly'));
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS bonus_structure TEXT;

-- Benefits (stored as TEXT[] array for selected benefits + free text for other)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS benefits TEXT[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS benefits_other TEXT;

-- Recruitment details
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS application_deadline DATE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS guarantee_period_months INTEGER
  CHECK (guarantee_period_months IS NULL OR (guarantee_period_months >= 0 AND guarantee_period_months <= 2));
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS recruiter_fee_manual INTEGER
  CHECK (recruiter_fee_manual IS NULL OR recruiter_fee_manual >= 2000);

-- Confidential
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN DEFAULT FALSE;

-- Job status type
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS position_type TEXT
  CHECK (position_type IS NULL OR position_type IN ('new', 'replacement'));

-- Headcount
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS open_positions INTEGER DEFAULT 1
  CHECK (open_positions IS NULL OR (open_positions >= 1 AND open_positions <= 100));

-- Key requirements
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS min_years_experience INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS required_degree TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS required_certifications TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS required_technical_skills TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS required_industry_experience TEXT;

-- Language requirement
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS required_language TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS required_language_level TEXT
  CHECK (required_language_level IS NULL OR required_language_level IN ('basic', 'intermediate', 'advanced', 'fluent', 'native'));

-- Structured job description
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS team_structure TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tools_technologies TEXT;

-- Screening questions (stored as JSONB array of strings)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS screening_questions JSONB DEFAULT '[]'::jsonb;

-- Hiring process details
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS interview_type TEXT
  CHECK (interview_type IS NULL OR interview_type IN ('online', 'onsite', 'both'));
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS technical_test_required BOOLEAN;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assessment_type TEXT;

-- Working conditions
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS working_hours TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS flexible_hours BOOLEAN;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS shift_work TEXT
  CHECK (shift_work IS NULL OR shift_work IN ('no', 'yes', 'rotating'));
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS shift_timings TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS overtime_policy TEXT;

-- Timeline
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS desired_start_date DATE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS urgency_level INTEGER
  CHECK (urgency_level IS NULL OR urgency_level IN (1, 2, 3));

-- Other
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS travel_required BOOLEAN;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS background_check_required BOOLEAN;
