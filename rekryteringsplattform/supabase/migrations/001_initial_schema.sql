-- =============================================
-- REKRYTERINGSPLATTFORM - DATABASSCHEMA
-- =============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE user_role AS ENUM ('company', 'recruiter', 'admin');
CREATE TYPE job_status AS ENUM ('draft', 'active', 'paused', 'filled', 'closed', 'cancelled');
CREATE TYPE candidate_status AS ENUM ('submitted', 'reviewing', 'interview', 'offered', 'hired', 'guarantee_period', 'completed', 'rejected', 'declined');
CREATE TYPE placement_status AS ENUM ('confirmed', 'invoice_sent', 'payment_received', 'guarantee_active', 'payout_released', 'guarantee_failed', 'refund_processing');
CREATE TYPE recruiter_approval AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- =============================================
-- PROFILES (extends Supabase auth.users)
-- =============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- COMPANIES
-- =============================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  org_number TEXT, -- Organisationsnummer
  description TEXT,
  industry TEXT,
  website TEXT,
  logo_url TEXT,
  city TEXT,
  country TEXT DEFAULT 'SE',
  employee_count TEXT, -- "1-10", "11-50", "51-200", etc.
  billing_email TEXT,
  billing_address TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

-- =============================================
-- RECRUITERS
-- =============================================

CREATE TABLE recruiters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  headline TEXT, -- "Senior IT-rekryterare med 10 års erfarenhet"
  bio TEXT,
  specializations TEXT[], -- ["IT & Tech", "Finans & Bank"]
  locations TEXT[], -- ["Stockholm", "Remote"]
  years_experience INTEGER,
  linkedin_url TEXT,
  approval_status recruiter_approval NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  rating DECIMAL(3,2) DEFAULT 0, -- 0.00 - 5.00
  total_placements INTEGER DEFAULT 0,
  stripe_connect_id TEXT, -- For payouts
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

-- =============================================
-- JOBS
-- =============================================

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT, -- Kvalifikationer
  nice_to_have TEXT,
  industry TEXT NOT NULL,
  location TEXT NOT NULL,
  employment_type TEXT NOT NULL DEFAULT 'Heltid',
  remote_policy TEXT, -- "På plats", "Hybrid", "Remote"
  salary_min INTEGER, -- Årslön i SEK
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'SEK',
  fee_percentage DECIMAL(4,2) NOT NULL DEFAULT 15.00, -- % av årslön
  max_recruiters INTEGER NOT NULL DEFAULT 5,
  current_recruiter_count INTEGER NOT NULL DEFAULT 0,
  status job_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  filled_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for search and filtering
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_industry ON jobs(industry);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_company ON jobs(company_id);
CREATE INDEX idx_jobs_title_search ON jobs USING gin(title gin_trgm_ops);

-- =============================================
-- JOB MANDATES (recruiter claims a job)
-- =============================================

CREATE TABLE job_mandates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  recruiter_id UUID NOT NULL REFERENCES recruiters(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ,

  UNIQUE(job_id, recruiter_id)
);

CREATE INDEX idx_mandates_job ON job_mandates(job_id);
CREATE INDEX idx_mandates_recruiter ON job_mandates(recruiter_id);

-- =============================================
-- CANDIDATES (presented by recruiter for a job)
-- =============================================

CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  recruiter_id UUID NOT NULL REFERENCES recruiters(id) ON DELETE CASCADE,
  mandate_id UUID NOT NULL REFERENCES job_mandates(id) ON DELETE CASCADE,

  -- Candidate info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  current_title TEXT,
  current_company TEXT,
  years_experience INTEGER,
  expected_salary INTEGER, -- Förväntad årslön

  -- Presentation
  cv_file_path TEXT, -- Supabase storage path
  cover_note TEXT, -- Rekryterarens anteckning
  qualification_summary TEXT, -- Varför denna kandidat passar

  -- Status
  status candidate_status NOT NULL DEFAULT 'submitted',
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  rejection_reason TEXT,

  -- Timestamps
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  interview_at TIMESTAMPTZ,
  offered_at TIMESTAMPTZ,
  hired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_candidates_job ON candidates(job_id);
CREATE INDEX idx_candidates_recruiter ON candidates(recruiter_id);
CREATE INDEX idx_candidates_status ON candidates(status);

-- =============================================
-- PLACEMENTS (successful hires)
-- =============================================

CREATE TABLE placements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidates(id),
  job_id UUID NOT NULL REFERENCES jobs(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  recruiter_id UUID NOT NULL REFERENCES recruiters(id),

  -- Financial
  annual_salary INTEGER NOT NULL,
  salary_currency TEXT DEFAULT 'SEK',
  fee_percentage DECIMAL(4,2) NOT NULL,
  total_fee INTEGER NOT NULL, -- Calculated: salary * fee%
  platform_fee INTEGER NOT NULL, -- 25% of total_fee
  recruiter_fee INTEGER NOT NULL, -- 75% of total_fee

  -- Status
  status placement_status NOT NULL DEFAULT 'confirmed',
  start_date DATE NOT NULL,
  guarantee_end_date DATE NOT NULL, -- start_date + 90 days

  -- Payment tracking
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  stripe_payout_id TEXT,
  invoice_sent_at TIMESTAMPTZ,
  payment_received_at TIMESTAMPTZ,
  payout_released_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(candidate_id)
);

CREATE INDEX idx_placements_company ON placements(company_id);
CREATE INDEX idx_placements_recruiter ON placements(recruiter_id);
CREATE INDEX idx_placements_status ON placements(status);

-- =============================================
-- MESSAGES
-- =============================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(conversation_id, user_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_system_message BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);

-- =============================================
-- NOTIFICATIONS
-- =============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT, -- Internal URL to navigate to
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- =============================================
-- ACTIVITY LOG (for admin)
-- =============================================

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL, -- 'job_created', 'candidate_submitted', 'placement_confirmed', etc.
  entity_type TEXT, -- 'job', 'candidate', 'placement'
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON recruiters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON placements FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'company')::user_role,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Increment/decrement recruiter count on mandate
CREATE OR REPLACE FUNCTION update_job_recruiter_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE jobs SET current_recruiter_count = current_recruiter_count + 1 WHERE id = NEW.job_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
    UPDATE jobs SET current_recruiter_count = current_recruiter_count - 1 WHERE id = NEW.job_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_mandate_change
  AFTER INSERT OR UPDATE ON job_mandates
  FOR EACH ROW
  EXECUTE FUNCTION update_job_recruiter_count();
