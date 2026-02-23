export enum UserRole {
  COMPANY = "company",
  RECRUITER = "recruiter",
  ADMIN = "admin",
}

export enum JobStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  PAUSED = "paused",
  FILLED = "filled",
  CLOSED = "closed",
  CANCELLED = "cancelled",
}

export enum CandidateStatus {
  SUBMITTED = "submitted",
  DUPLICATE_REJECTED = "duplicate_rejected",
  CLIENT_ALREADY_ENGAGED = "client_already_engaged",
  UNDER_CLIENT_REVIEW = "under_client_review",
  INFO_REQUESTED = "info_requested",
  RESUBMITTED = "resubmitted",
  REVIEWING = "reviewing",
  INTERVIEW = "interview",
  INTERVIEW_STAGE_1 = "interview_stage_1",
  INTERVIEW_STAGE_2 = "interview_stage_2",
  INTERVIEW_STAGE_3 = "interview_stage_3",
  FINAL_INTERVIEW = "final_interview",
  REJECTED_CLIENT = "rejected_client",
  REJECTED_INTERVIEW = "rejected_interview",
  ON_HOLD = "on_hold",
  OFFERED = "offered",
  OFFER_IN_PROGRESS = "offer_in_progress",
  OFFER_DECLINED = "offer_declined",
  OFFER_ACCEPTED = "offer_accepted",
  HIRED = "hired",
  INVOICE_ENABLED = "invoice_enabled",
  GUARANTEE_TRACKING = "guarantee_tracking",
  CANDIDATE_WITHDRAWN = "candidate_withdrawn",
  GUARANTEE_PERIOD = "guarantee_period",
  COMPLETED = "completed",
  REJECTED = "rejected",
  DECLINED = "declined",
}

export const JOB_INDUSTRIES = [
  "IT & Tech",
  "Finans & Bank",
  "Life Science & Pharma",
  "Ingenjör & Industri",
  "Sälj & Marknad",
  "HR & Rekrytering",
  "Juridik",
  "Bygg & Fastighet",
  "Logistik & Supply Chain",
  "Hälsa & Sjukvård",
  "Utbildning",
  "Offentlig sektor",
  "Övrigt",
] as const;

export const JOB_LOCATIONS = [
  "Stockholm",
  "Göteborg",
  "Malmö",
  "Uppsala",
  "Linköping",
  "Örebro",
  "Västerås",
  "Umeå",
  "Remote (Sverige)",
  "Oslo",
  "Bergen",
  "Köpenhamn",
  "Remote (Norden)",
  "Övrigt",
] as const;

export const MAX_RECRUITERS_PER_JOB = 5;
export const GUARANTEE_PERIOD_DAYS = 90;
export const DEFAULT_FEE_PERCENTAGE = 15;

export const MAX_PIPELINE_STAGES = 8;
export const MAX_INTERVIEW_STAGES = 4;
export const MAX_TEST_STAGES = 4;

export const DEFAULT_PIPELINE_STAGES = [
    { id: 'screening', type: 'screening' as const, title: 'Screening', order: 0 },
    { id: 'interview-1', type: 'interview' as const, title: 'Intervju 1', order: 1 },
];
