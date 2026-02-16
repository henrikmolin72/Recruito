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

export enum PlacementStatus {
  CONFIRMED = "confirmed",
  INVOICE_SENT = "invoice_sent",
  PAYMENT_RECEIVED = "payment_received",
  GUARANTEE_ACTIVE = "guarantee_active",
  PAYOUT_RELEASED = "payout_released",
  GUARANTEE_FAILED = "guarantee_failed",
  REFUND_PROCESSING = "refund_processing",
}

export enum RecruiterApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  SUSPENDED = "suspended",
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

export const EMPLOYMENT_TYPES = [
  "Heltid",
  "Deltid",
  "Konsult",
  "Vikariat",
] as const;

export const MAX_RECRUITERS_PER_JOB = 5;
export const GUARANTEE_PERIOD_DAYS = 90;
export const DEFAULT_FEE_PERCENTAGE = 15;
export const PLATFORM_COMMISSION_PERCENTAGE = 25;
export const RECRUITER_COMMISSION_PERCENTAGE = 75;
