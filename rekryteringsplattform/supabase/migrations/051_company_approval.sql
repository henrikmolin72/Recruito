-- Company admin-approval gate (mirrors the recruiters.approval_status pattern).
-- New companies register as 'pending' and are blocked from the dashboard until
-- an admin approves them. EXISTING companies default to 'approved' so no current
-- company is locked out by this migration.
--
-- Column additions inherit the companies table grants; no extra GRANT needed.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'suspended', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_companies_approval_status
  ON public.companies(approval_status);
