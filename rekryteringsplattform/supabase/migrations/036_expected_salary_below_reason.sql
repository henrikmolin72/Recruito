-- 036 – Reason field shown when expected salary is below current salary
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS expected_salary_below_current_reason TEXT;
