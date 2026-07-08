import { normalizeCandidateStatusForWorkflow } from "@/lib/candidate-workflow";

// Display buckets for the COMPANY candidate view only (per 2026-07-08 rebuild spec).
// Pure display mapping — the workflow engine and on_hold status are untouched:
// - "Presented" bucket removed (was always empty behind the recruito_screened_at gate)
// - on_hold folds into under_review (company never sets/sees a "Paused" stage)
// - final_interview folds into interview (client mockup has no separate Final tab)
export const COMPANY_STAGE_BUCKETS = [
  "under_review",
  "interview",
  "offered",
  "hired",
  "rejected",
  "withdrawn",
] as const;

export type CompanyStageBucket = (typeof COMPANY_STAGE_BUCKETS)[number];

export function companyStageBucket(status: string | null | undefined): CompanyStageBucket {
  const n = normalizeCandidateStatusForWorkflow(status);
  if (["interview_stage_1", "interview_stage_2", "interview_stage_3", "final_interview"].includes(n)) return "interview";
  if (["offer_in_progress", "offer_accepted"].includes(n)) return "offered";
  if (["hired", "invoice_enabled", "guarantee_tracking", "completed"].includes(n)) return "hired";
  if (["duplicate_rejected", "client_already_engaged", "rejected_client", "rejected_interview", "offer_declined", "recruito_rejected"].includes(n)) return "rejected";
  if (n === "candidate_withdrawn") return "withdrawn";
  // submitted, under_client_review, info_requested, resubmitted, on_hold — and any
  // future status — land in under_review so every candidate is visible in a tab.
  return "under_review";
}
