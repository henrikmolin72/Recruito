-- =============================================
-- 029: Guarantee Automation
-- Adds breach reports table + reminder tracking
-- =============================================

-- 1. Guarantee breach reports (company-initiated)
CREATE TABLE IF NOT EXISTS guarantee_breach_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  placement_id UUID NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Details
  end_date DATE NOT NULL,                  -- actual last day of candidate
  reason TEXT NOT NULL CHECK (reason IN ('candidate_resigned', 'performance', 'mutual_agreement', 'other')),
  notes TEXT,

  -- Admin review
  admin_status TEXT NOT NULL DEFAULT 'pending' CHECK (admin_status IN ('pending', 'approved', 'rejected')),
  admin_reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,

  -- Refund calculation (proportional to remaining guarantee time)
  refund_amount INTEGER,
  refund_currency TEXT DEFAULT 'SEK',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(placement_id) -- one active breach report per placement
);

CREATE INDEX IF NOT EXISTS idx_breach_reports_placement ON guarantee_breach_reports(placement_id);
CREATE INDEX IF NOT EXISTS idx_breach_reports_company ON guarantee_breach_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_breach_reports_status ON guarantee_breach_reports(admin_status);

-- 2. Guarantee reminder log (track which reminders have been sent)
CREATE TABLE IF NOT EXISTS guarantee_reminders_sent (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  placement_id UUID NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('t_minus_14', 't_minus_7', 'expired')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(placement_id, reminder_type)
);

-- 3. Trigger for updated_at
CREATE TRIGGER update_guarantee_breach_reports_updated_at
  BEFORE UPDATE ON guarantee_breach_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. RLS
ALTER TABLE guarantee_breach_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies manage their breach reports"
  ON guarantee_breach_reports FOR ALL
  USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins manage all breach reports"
  ON guarantee_breach_reports FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

ALTER TABLE guarantee_reminders_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage reminder log"
  ON guarantee_reminders_sent FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
