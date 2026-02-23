export type UserRole = 'company' | 'recruiter' | 'admin';
export type JobStatus = 'draft' | 'active' | 'paused' | 'filled' | 'closed' | 'cancelled';
export type CandidateStatus = 'submitted' | 'reviewing' | 'interview' | 'offered' | 'hired' | 'completed' | 'rejected' | 'declined' | 'paused';
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
    salary_min: number | null;
    salary_max: number | null;
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
