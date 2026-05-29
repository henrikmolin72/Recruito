// Shared mandate candidate-stage definitions, used by both the recruiter
// mandates list (clickable count badges) and the mandate detail page (stage
// filter) so the two stay in sync.

export type MandateStage =
    | "in_review"
    | "submitted"
    | "interview"
    | "offer"
    | "hired"
    | "rejected";

export const MANDATE_STAGE_KEYS: MandateStage[] = [
    "in_review",
    "submitted",
    "interview",
    "offer",
    "hired",
    "rejected",
];

// "In Review" = still in Recruito's internal review, not yet screened/submitted
// to the client. recruito_screened_at is the divider (empty => internal review).
const IN_REVIEW_STATUSES = new Set(["submitted", "reviewing"]);
const SUBMITTED_STATUSES = new Set([
    "under_client_review", "info_requested", "resubmitted",
    "submitted_to_client", "client_already_engaged", "duplicate_rejected",
]);
const INTERVIEW_STATUSES = new Set([
    "interview", "interview_stage_1", "interview_stage_2",
    "interview_stage_3", "final_interview",
]);
const OFFER_STATUSES = new Set([
    "offer_in_progress", "offer_accepted", "offer_declined",
]);
const HIRED_STATUSES = new Set([
    "hired", "invoice_enabled", "guarantee_tracking", "completed",
    "guarantee_active", "payout_released", "guarantee_period",
]);
const REJECTED_STATUSES = new Set([
    "rejected", "declined", "rejected_client", "rejected_interview",
    "candidate_withdrawn", "guarantee_failed", "recruiter_rejected",
]);

export interface StageCandidate {
    status: string | null;
    recruito_screened_at?: string | null;
}

// Whether a candidate belongs to a given stage. "in_review" additionally
// requires that the candidate has NOT been screened to the client yet.
export function candidateInStage(c: StageCandidate, stage: MandateStage): boolean {
    const s = c.status ?? "";
    switch (stage) {
        case "in_review":
            return IN_REVIEW_STATUSES.has(s) && !c.recruito_screened_at;
        case "submitted":
            return SUBMITTED_STATUSES.has(s);
        case "interview":
            return INTERVIEW_STATUSES.has(s);
        case "offer":
            return OFFER_STATUSES.has(s);
        case "hired":
            return HIRED_STATUSES.has(s);
        case "rejected":
            return REJECTED_STATUSES.has(s);
        default:
            return false;
    }
}

export function isMandateStage(value: string | null | undefined): value is MandateStage {
    return !!value && (MANDATE_STAGE_KEYS as string[]).includes(value);
}
