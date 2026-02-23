-- =============================================
-- EXTEND CANDIDATE STATUS ENUM FOR NEW WORKFLOW
-- =============================================

ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'duplicate_rejected';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'client_already_engaged';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'under_client_review';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'info_requested';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'resubmitted';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'interview_stage_1';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'interview_stage_2';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'interview_stage_3';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'final_interview';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'rejected_client';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'rejected_interview';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'on_hold';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'offer_in_progress';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'offer_declined';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'offer_accepted';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'invoice_enabled';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'guarantee_tracking';
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'candidate_withdrawn';

