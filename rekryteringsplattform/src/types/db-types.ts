export type UserRole = 'company' | 'recruiter' | 'admin';
export type JobStatus = 'draft' | 'active' | 'paused' | 'filled' | 'closed' | 'cancelled';
export type CandidateStatus =
  | 'submitted'
  | 'reviewing'
  | 'interview'
  | 'offered'
  | 'hired'
  | 'completed'
  | 'rejected'
  | 'declined'
  | 'paused'
  | 'duplicate_rejected'
  | 'client_already_engaged'
  | 'under_client_review'
  | 'info_requested'
  | 'resubmitted'
  | 'interview_stage_1'
  | 'interview_stage_2'
  | 'interview_stage_3'
  | 'final_interview'
  | 'rejected_client'
  | 'rejected_interview'
  | 'on_hold'
  | 'offer_in_progress'
  | 'offer_declined'
  | 'offer_accepted'
  | 'invoice_enabled'
  | 'guarantee_tracking'
  | 'candidate_withdrawn'
  | 'guarantee_period';
export type RecruiterApproval = 'pending' | 'approved' | 'rejected' | 'suspended';
export type PipelineStageType = 'screening' | 'interview' | 'test' | 'assessment';
export type CompanyCandidateNextStep = 'request_tests' | 'pause_candidate' | 'reject_candidate' | 'proceed_to_hire';

export interface PipelineStage {
    id: string;
    type: PipelineStageType;
    title: string;
    description?: string | null;
    order: number;
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
    is_verified: boolean;
    created_at: string;
}

export interface Recruiter {
    id: string;
    user_id: string;
    headline: string | null;
    bio: string | null;
    linkedin_url?: string | null;
    years_experience?: number | null;
    current_country?: string | null;
    experience_bracket?: string | null;
    primary_industries?: string[] | null;
    primary_industries_other?: string | null;
    countries_experience?: string[] | null;
    languages_spoken?: unknown[] | null;
    seniority_focus?: string[] | null;
    roles_per_week?: number | null;
    candidates_sourced_last_12m?: number | null;
    successful_placements_last_12m?: number | null;
    average_time_to_fill?: string | null;
    challenging_role_example?: string | null;
    sourcing_channels?: string[] | null;
    sourcing_channels_other?: string | null;
    available_hours_per_week?: string | null;
    onboarding_completed_at?: string | null;
    approval_status: RecruiterApproval;
    rating: number;
    total_placements: number;
}

export interface Job {
    id: string;
    company_id: string;
    title: string;
    description: string;
    requirements: string | null;
    location: string;
    employment_type: string;
    contract_duration: string | null;
    // Structured location
    country: string | null;
    city: string | null;
    location_code: string | null;
    // Work type
    work_type: string | null;
    remote_type: string | null;
    // Work authorization
    work_permit_accepted: boolean | null;
    visa_sponsorship: boolean | null;
    // Salary
    salary_min: number | null;
    salary_max: number | null;
    salary_currency: string | null;
    salary_gross_net: string | null;
    salary_period: string | null;
    bonus_structure: string | null;
    // Benefits
    benefits: string[] | null;
    benefits_other: string | null;
    // Recruitment details
    application_deadline: string | null;
    guarantee_period_months: number | null;
    recruiter_fee_manual: number | null;
    is_confidential: boolean;
    // Position
    position_type: string | null;
    open_positions: number | null;
    // Requirements
    min_years_experience: number | null;
    required_degree: string | null;
    required_certifications: string | null;
    required_technical_skills: string | null;
    required_industry_experience: string | null;
    // Language
    required_language: string | null;
    required_language_level: string | null;
    // Structured description
    team_structure: string | null;
    tools_technologies: string | null;
    // Screening
    screening_questions: string[];
    // Hiring process
    interview_type: string | null;
    technical_test_required: boolean | null;
    assessment_type: string | null;
    // Working conditions
    working_hours: string | null;
    flexible_hours: boolean | null;
    shift_work: string | null;
    shift_timings: string | null;
    overtime_policy: string | null;
    // Timeline
    desired_start_date: string | null;
    urgency_level: number | null;
    // Other
    travel_required: boolean | null;
    background_check_required: boolean | null;
    // Core
    fee_percentage: number;
    max_recruiters: number;
    current_recruiter_count: number;
    status: JobStatus;
    pipeline_stages: PipelineStage[];
    created_at: string;
    // Join fields usually
    company?: Company;
}

export interface Candidate {
    id: string;
    job_id: string;
    recruiter_id: string;
    status: CandidateStatus;
    current_pipeline_stage: string | null;
    company_requested_next_step?: CompanyCandidateNextStep | null;
    company_requested_next_step_note?: string | null;
    company_requested_next_step_at?: string | null;
    company_requested_next_step_by?: string | null;
    first_name: string;
    last_name: string;
    email: string | null;
    submitted_at: string;
    // Join fields
    job?: Job;
    recruiter?: Recruiter;
}
