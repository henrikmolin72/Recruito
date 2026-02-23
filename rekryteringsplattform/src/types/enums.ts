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
  REVIEWING = "reviewing",
  INTERVIEW = "interview",
  OFFERED = "offered",
  HIRED = "hired",
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
