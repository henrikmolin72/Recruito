import { UserRole, JobStatus, CandidateStatus, PlacementStatus, RecruiterApprovalStatus } from "./enums";

export interface Profile {
  id: string;
  role: UserRole;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  user_id: string;
  company_name: string;
  org_number: string | null;
  description: string | null;
  industry: string | null;
  website: string | null;
  logo_url: string | null;
  city: string | null;
  country: string;
  employee_count: string | null;
  billing_email: string | null;
  billing_address: string | null;
  is_verified: boolean;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Recruiter {
  id: string;
  user_id: string;
  headline: string | null;
  bio: string | null;
  specializations: string[];
  locations: string[];
  years_experience: number | null;
  linkedin_url: string | null;
  approval_status: RecruiterApprovalStatus;
  approved_at: string | null;
  approved_by: string | null;
  rating: number;
  total_placements: number;
  stripe_connect_id: string | null;
  stripe_onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  company_id: string;
  title: string;
  description: string;
  requirements: string | null;
  nice_to_have: string | null;
  industry: string;
  location: string;
  employment_type: string;
  remote_policy: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  fee_percentage: number;
  max_recruiters: number;
  current_recruiter_count: number;
  status: JobStatus;
  published_at: string | null;
  filled_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  companies?: Company;
}

export interface JobMandate {
  id: string;
  job_id: string;
  recruiter_id: string;
  is_active: boolean;
  claimed_at: string;
  released_at: string | null;
}

export interface Candidate {
  id: string;
  job_id: string;
  recruiter_id: string;
  mandate_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  current_title: string | null;
  current_company: string | null;
  years_experience: number | null;
  expected_salary: number | null;
  cv_file_path: string | null;
  cover_note: string | null;
  qualification_summary: string | null;
  status: CandidateStatus;
  status_changed_at: string | null;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  interview_at: string | null;
  offered_at: string | null;
  hired_at: string | null;
  created_at: string;
  updated_at: string;
  jobs?: Job;
  recruiters?: Recruiter & { profiles?: Profile };
}

export interface Placement {
  id: string;
  candidate_id: string;
  job_id: string;
  company_id: string;
  recruiter_id: string;
  annual_salary: number;
  salary_currency: string;
  fee_percentage: number;
  total_fee: number;
  platform_fee: number;
  recruiter_fee: number;
  status: PlacementStatus;
  start_date: string;
  guarantee_end_date: string;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  stripe_payout_id: string | null;
  invoice_sent_at: string | null;
  payment_received_at: string | null;
  payout_released_at: string | null;
  created_at: string;
  updated_at: string;
  candidates?: Candidate;
  jobs?: Job;
  companies?: Company;
  recruiters?: Recruiter & { profiles?: Profile };
}

export interface Conversation {
  id: string;
  job_id: string | null;
  candidate_id: string | null;
  created_at: string;
  messages?: Message[];
  conversation_participants?: ConversationParticipant[];
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
  profiles?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_system_message: boolean;
  created_at: string;
  profiles?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface UserProfile extends Profile {
  company_id?: string;
  company_name?: string;
  recruiter_id?: string;
  approval_status?: RecruiterApprovalStatus;
}
