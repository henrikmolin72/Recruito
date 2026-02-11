-- 005_candidate_ownership.sql
-- 12-month candidate ownership protection for recruiters

-- Candidate ownership table - tracks recruiter ownership of candidates
CREATE TABLE IF NOT EXISTS candidate_ownership (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  recruiter_id UUID NOT NULL REFERENCES recruiters(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_email TEXT,
  candidate_name TEXT NOT NULL,
  ownership_start DATE NOT NULL DEFAULT CURRENT_DATE,
  ownership_end DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '12 months'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'claimed', 'disputed')),
  claimed_placement_id UUID REFERENCES placements(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ownership_recruiter ON candidate_ownership(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_ownership_company ON candidate_ownership(company_id);
CREATE INDEX IF NOT EXISTS idx_ownership_candidate ON candidate_ownership(candidate_id);
CREATE INDEX IF NOT EXISTS idx_ownership_email ON candidate_ownership(candidate_email);
CREATE INDEX IF NOT EXISTS idx_ownership_status ON candidate_ownership(status);
CREATE INDEX IF NOT EXISTS idx_ownership_end ON candidate_ownership(ownership_end);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON candidate_ownership FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE candidate_ownership ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Recruiters can view their own ownership" ON candidate_ownership
  FOR SELECT USING (recruiter_id IN (SELECT id FROM recruiters WHERE user_id = auth.uid()));

CREATE POLICY "Companies can view ownership for their jobs" ON candidate_ownership
  FOR SELECT USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all ownership" ON candidate_ownership
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
