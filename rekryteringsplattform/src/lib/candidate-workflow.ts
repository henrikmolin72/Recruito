export const NEW_CANDIDATE_WORKFLOW_STATUSES = [
  "duplicate_rejected",
  "client_already_engaged",
  "under_client_review",
  "info_requested",
  "resubmitted",
  "interview_stage_1",
  "interview_stage_2",
  "interview_stage_3",
  "final_interview",
  "rejected_client",
  "rejected_interview",
  "on_hold",
  "offer_in_progress",
  "offer_declined",
  "offer_accepted",
  "invoice_enabled",
  "guarantee_tracking",
  "candidate_withdrawn",
  "recruito_rejected",
] as const;

export const LEGACY_CANDIDATE_STATUSES = [
  "submitted",
  "reviewing",
  "interview",
  "offered",
  "hired",
  "guarantee_period",
  "completed",
  "rejected",
  "declined",
  "paused",
] as const;

export const ALL_CANDIDATE_STATUSES = [
  ...LEGACY_CANDIDATE_STATUSES,
  ...NEW_CANDIDATE_WORKFLOW_STATUSES,
] as const;

export type CandidateWorkflowStatus = (typeof ALL_CANDIDATE_STATUSES)[number];

export const INTERVIEW_WORKFLOW_STATUSES = [
  "interview_stage_1",
  "interview_stage_2",
  "interview_stage_3",
  "final_interview",
] as const;

const INTERVIEW_STATUS_SET = new Set<string>(INTERVIEW_WORKFLOW_STATUSES);

export function isCandidateStatusValue(status: string): status is CandidateWorkflowStatus {
  return (ALL_CANDIDATE_STATUSES as readonly string[]).includes(status);
}

export function isInterviewWorkflowStatus(status: string | null | undefined) {
  return !!status && INTERVIEW_STATUS_SET.has(status);
}

export function normalizeCandidateStatusForWorkflow(status: string | null | undefined): CandidateWorkflowStatus {
  switch (status) {
    case "reviewing":
      return "under_client_review";
    case "interview":
      return "interview_stage_1";
    case "offered":
      return "offer_in_progress";
    case "paused":
      return "on_hold";
    case "rejected":
      return "rejected_client";
    case "declined":
      return "offer_declined";
    case "guarantee_period":
      return "guarantee_tracking";
    default:
      return (isCandidateStatusValue(status || "") ? (status as CandidateWorkflowStatus) : "submitted");
  }
}

export const TERMINAL_CANDIDATE_STATUSES = new Set<string>([
  "duplicate_rejected",
  "client_already_engaged",
  "rejected_client",
  "rejected_interview",
  "offer_declined",
  "candidate_withdrawn",
  "completed",
  "declined",
  "recruito_rejected",
]);

const TRANSITIONS: Record<string, string[]> = {
  submitted: ["duplicate_rejected", "client_already_engaged", "under_client_review", "recruito_rejected"],
  duplicate_rejected: [],
  client_already_engaged: [],
  recruito_rejected: [],
  under_client_review: ["info_requested", "rejected_client", "interview_stage_1", "on_hold", "candidate_withdrawn", "offer_in_progress", "recruito_rejected"],
  info_requested: ["resubmitted", "rejected_client", "on_hold", "candidate_withdrawn", "recruito_rejected"],
  resubmitted: ["under_client_review", "rejected_client", "info_requested", "recruito_rejected"],
  interview_stage_1: ["interview_stage_2", "rejected_interview", "on_hold", "offer_in_progress", "candidate_withdrawn"],
  interview_stage_2: ["interview_stage_3", "final_interview", "rejected_interview", "on_hold", "offer_in_progress", "candidate_withdrawn"],
  interview_stage_3: ["final_interview", "rejected_interview", "on_hold", "offer_in_progress", "candidate_withdrawn"],
  final_interview: ["offer_in_progress", "rejected_interview", "on_hold", "candidate_withdrawn"],
  on_hold: [
    "under_client_review",
    "info_requested",
    "interview_stage_1",
    "interview_stage_2",
    "interview_stage_3",
    "final_interview",
    "offer_in_progress",
    "candidate_withdrawn",
    "rejected_client",
    "rejected_interview",
  ],
  offer_in_progress: ["offer_declined", "offer_accepted", "hired", "candidate_withdrawn", "on_hold"],
  offer_declined: [],
  offer_accepted: ["hired", "invoice_enabled", "guarantee_tracking"],
  hired: ["invoice_enabled", "guarantee_tracking", "completed"],
  invoice_enabled: ["guarantee_tracking", "completed"],
  guarantee_tracking: ["completed"],
  candidate_withdrawn: [],

  // Legacy transitions kept for older records / compatibility
  reviewing: ["under_client_review", "rejected_client", "info_requested", "interview_stage_1"],
  interview: ["interview_stage_1", "interview_stage_2", "rejected_interview", "offer_in_progress"],
  offered: ["offer_in_progress", "offer_accepted", "offer_declined", "hired"],
  paused: ["on_hold", "under_client_review", "interview_stage_1"],
  rejected: ["rejected_client"],
  declined: ["offer_declined"],
  guarantee_period: ["guarantee_tracking", "completed"],
  completed: [],
};

export function getAllowedCandidateTransitions(currentStatus: string | null | undefined): string[] {
  if (!currentStatus) return TRANSITIONS.submitted;
  return TRANSITIONS[currentStatus] || [];
}

export function canTransitionCandidateStatus(currentStatus: string | null | undefined, nextStatus: string): boolean {
  if (!isCandidateStatusValue(nextStatus)) return false;
  if (!currentStatus) return nextStatus === "submitted" || nextStatus === "under_client_review";
  if (currentStatus === nextStatus) return true;
  return getAllowedCandidateTransitions(currentStatus).includes(nextStatus);
}

export function statusChangeTimestampPatch(nextStatus: string) {
  const now = new Date().toISOString();
  const patch: Record<string, string> = {
    status_changed_at: now,
  };

  if (["under_client_review", "reviewing"].includes(nextStatus)) {
    patch.reviewed_at = now;
  }
  if (isInterviewWorkflowStatus(nextStatus) || nextStatus === "interview") {
    patch.interview_at = now;
  }
  if (["offer_in_progress", "offer_accepted", "offered"].includes(nextStatus)) {
    patch.offered_at = now;
  }
  if (nextStatus === "hired") {
    patch.hired_at = now;
  }

  return patch;
}

export function inferInterviewWorkflowStatus(
  currentStatus: string | null | undefined,
  stageTitle?: string | null
): CandidateWorkflowStatus {
  const title = (stageTitle || "").toLowerCase();
  if (title.includes("final")) return "final_interview";
  if (title.includes("slut")) return "final_interview";
  if (title.match(/\b3\b/)) return "interview_stage_3";
  if (title.match(/\b2\b/)) return "interview_stage_2";
  if (title.match(/\b1\b/)) return "interview_stage_1";

  const normalizedCurrent = normalizeCandidateStatusForWorkflow(currentStatus);
  switch (normalizedCurrent) {
    case "interview_stage_1":
      return "interview_stage_2";
    case "interview_stage_2":
      return "interview_stage_3";
    case "interview_stage_3":
      return "final_interview";
    default:
      return "interview_stage_1";
  }
}

export type WorkflowVisualNodeId =
  | "submitted"
  | "validation"
  | "under_client_review"
  | "info_requested"
  | "resubmitted"
  | "interview_stage_1"
  | "interview_stage_2"
  | "interview_stage_3"
  | "final_interview"
  | "offer_in_progress"
  | "offer_accepted"
  | "hired"
  | "invoice_enabled"
  | "guarantee_tracking"
  | "on_hold";

export const WORKFLOW_VISUAL_NODES: Array<{ id: WorkflowVisualNodeId; label: string }> = [
  { id: "submitted", label: "Submitted" },
  { id: "validation", label: "Duplicate Check" },
  { id: "under_client_review", label: "Under Client Review" },
  { id: "info_requested", label: "Info Requested" },
  { id: "resubmitted", label: "Resubmitted" },
  { id: "interview_stage_1", label: "Interview Stage 1" },
  { id: "interview_stage_2", label: "Interview Stage 2" },
  { id: "interview_stage_3", label: "Interview Stage 3" },
  { id: "final_interview", label: "Final Interview" },
  { id: "offer_in_progress", label: "Offer in Progress" },
  { id: "offer_accepted", label: "Offer Accepted" },
  { id: "hired", label: "Hired" },
  { id: "invoice_enabled", label: "Invoice Enabled" },
  { id: "guarantee_tracking", label: "Guarantee Tracking" },
  { id: "on_hold", label: "On Hold" },
];

export function getWorkflowVisualNodeId(status: string | null | undefined): WorkflowVisualNodeId {
  const normalized = normalizeCandidateStatusForWorkflow(status);
  switch (normalized) {
    case "submitted":
      return "submitted";
    case "duplicate_rejected":
    case "client_already_engaged":
      return "validation";
    case "under_client_review":
    case "rejected_client":
      return "under_client_review";
    case "info_requested":
      return "info_requested";
    case "resubmitted":
      return "resubmitted";
    case "interview_stage_1":
      return "interview_stage_1";
    case "interview_stage_2":
      return "interview_stage_2";
    case "interview_stage_3":
      return "interview_stage_3";
    case "final_interview":
    case "rejected_interview":
    case "candidate_withdrawn":
      return "final_interview";
    case "offer_in_progress":
    case "offer_declined":
      return "offer_in_progress";
    case "offer_accepted":
      return "offer_accepted";
    case "hired":
      return "hired";
    case "invoice_enabled":
      return "invoice_enabled";
    case "guarantee_tracking":
    case "guarantee_period":
      return "guarantee_tracking";
    case "on_hold":
    case "paused":
      return "on_hold";
    case "completed":
      return "guarantee_tracking";
    default:
      return "submitted";
  }
}

