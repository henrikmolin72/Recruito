// Shared mandate candidate-stage definitions, used by both the recruiter
// mandates list (clickable count badges) and the mandate detail page (stage
// filter) so the two stay in sync.

export type MandateStage =
    | "draft"
    | "in_review"
    | "submitted"
    | "interview"
    | "offer"
    | "hired"
    | "rejected";

export const MANDATE_STAGE_KEYS: MandateStage[] = [
    "draft",
    "in_review",
    "submitted",
    "interview",
    "offer",
    "hired",
    "rejected",
];

// Days after a mandate is claimed before it is considered expired (no candidate
// screened to the client). Single source of truth shared by the recruiter
// mandates view and the expiry cron, so the UI and the notification never drift.
export const MANDATE_EXPIRY_DAYS = 10;

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
    "recruito_rejected",
]);

// Statuses that make a candidate "not live" for the mandate-expiry timer.
// Per product rule: a submitted candidate suspends the expiry; the 10-day timer
// only (re)starts once EVERY candidate has been explicitly rejected. Only hard
// rejections count here — a withdrawal/duplicate does NOT restart the clock.
const EXPIRY_REJECTED_STATUSES = new Set([
    "rejected_client", "rejected_interview", "recruito_rejected", "declined", "rejected",
]);

export interface ExpiryCandidate {
    status: string | null;
    status_changed_at?: string | null;
}

// Days left on the mandate's no-delivery expiry, or null when no expiry applies
// (at least one live candidate exists). Single source of truth shared by the
// recruiter mandates view and the expiry cron.
//   - 0 candidates           → 10 days from claim.
//   - any live candidate      → no expiry (null).
//   - all candidates rejected → 10 days from the most recent rejection.
export function mandateExpiryDaysLeft(opts: {
    claimedAt: string | null;
    candidates: ExpiryCandidate[];
    now?: number;
}): number | null {
    const { claimedAt } = opts;
    // Drafts are not real submissions — they never suspend the expiry timer.
    const candidates = opts.candidates.filter((c) => (c.status ?? "") !== "draft");
    const now = opts.now ?? Date.now();
    if (!claimedAt) return null;

    const hasLive = candidates.some((c) => !EXPIRY_REJECTED_STATUSES.has(c.status ?? ""));
    if (hasLive) return null;

    let baseMs: number;
    if (candidates.length === 0) {
        baseMs = new Date(claimedAt).getTime();
    } else {
        // All candidates rejected → restart from the last rejection date.
        const lastRejectionMs = candidates.reduce((max, c) => {
            const t = c.status_changed_at ? new Date(c.status_changed_at).getTime() : 0;
            return t > max ? t : max;
        }, 0);
        baseMs = lastRejectionMs || new Date(claimedAt).getTime();
    }

    const expiryMs = baseMs + MANDATE_EXPIRY_DAYS * 86_400_000;
    return Math.ceil((expiryMs - now) / 86_400_000);
}

export interface StageCandidate {
    status: string | null;
    recruito_screened_at?: string | null;
}

// Whether a candidate belongs to a given stage. "in_review" additionally
// requires that the candidate has NOT been screened to the client yet.
export function candidateInStage(c: StageCandidate, stage: MandateStage): boolean {
    const s = c.status ?? "";
    switch (stage) {
        case "draft":
            return s === "draft";
        case "in_review":
            return IN_REVIEW_STATUSES.has(s) && !c.recruito_screened_at;
        case "submitted":
            // A candidate still at a raw submitted/reviewing status but already
            // screened to the client belongs in "submitted", not nowhere — the
            // screen step sets recruito_screened_at without advancing status.
            return SUBMITTED_STATUSES.has(s) || (IN_REVIEW_STATUSES.has(s) && !!c.recruito_screened_at);
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
