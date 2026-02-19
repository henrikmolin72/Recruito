export type UserRole = 'company' | 'recruiter' | 'admin';
export type JobStatus = 'draft' | 'active' | 'paused' | 'filled' | 'closed' | 'cancelled';
export type CandidateStatus = 'submitted' | 'reviewing' | 'interview' | 'offered' | 'hired' | 'completed' | 'rejected' | 'declined';
export type RecruiterApproval = 'pending' | 'approved' | 'rejected' | 'suspended';

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
    created_at: string;
    // Join fields usually
    company?: Company;
}

export interface Candidate {
    id: string;
    job_id: string;
    recruiter_id: string;
    status: CandidateStatus;
    first_name: string;
    last_name: string;
    email: string | null;
    submitted_at: string;
    // Join fields
    job?: Job;
    recruiter?: Recruiter;
}
