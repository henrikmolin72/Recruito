-- 004_payment_enhancements.sql
-- Bank-based payment structure and interview bonus system

-- Bank transfer tracking for company payments
ALTER TABLE placements ADD COLUMN IF NOT EXISTS bank_reference TEXT;
ALTER TABLE placements ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE placements ADD COLUMN IF NOT EXISTS invoice_due_date DATE;

-- Bank transfer tracking for recruiter payouts
ALTER TABLE placements ADD COLUMN IF NOT EXISTS payout_bank_reference TEXT;
ALTER TABLE placements ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'bank_transfer';

-- Company bank/billing details
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_clearing_number TEXT;

-- Recruiter bank details for payouts
ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS bank_clearing_number TEXT;
ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS payout_email TEXT;

-- Interview bonuses table
CREATE TABLE IF NOT EXISTS interview_bonuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  recruiter_id UUID NOT NULL REFERENCES recruiters(id) ON DELETE CASCADE,
  bonus_type TEXT NOT NULL CHECK (bonus_type IN ('first_interview', 'final_interview')),
  amount_eur INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  bank_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_id, bonus_type)
);

CREATE INDEX idx_interview_bonuses_recruiter ON interview_bonuses(recruiter_id);
CREATE INDEX idx_interview_bonuses_status ON interview_bonuses(status);

-- Job exclusivity
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT TRUE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS exclusivity_end_date TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS exclusivity_accepted BOOLEAN DEFAULT FALSE;
