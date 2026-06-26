// Pure company-stage progression rules. NO server imports — safe to use in unit
// tests and (later) client UI. The server action (candidates.ts) enforces these
// before writing, and the timeline/panel UI reads them to decide which buttons
// to show.
//
// The company ladder is the linear happy path. Reject is available from every
// active rung; reopen (from rejected) is a separate path handled below.

// Type-only import (no server code) — keeps this module pure for unit tests/UI.
import type { CandidateStatus } from "@/types/db-types";

export const COMPANY_STAGE_LADDER = [
    "viewed",
    "interview",
    "final_interview",
    "job_offer",
    "hired",
] as const;

export type CompanyStage = (typeof COMPANY_STAGE_LADDER)[number];

// The full set of company stages a candidate can occupy: the linear ladder plus
// the "rejected" side-exit. (COMPANY_STAGE_LADDER above is only the forward path.)
export const COMPANY_STAGES = [...COMPANY_STAGE_LADDER, "rejected"] as const;
export type CompanyStageValue = (typeof COMPANY_STAGES)[number];

// How each company stage maps onto candidates.status — the field every recruiter
// view derives a candidate's stage from. EXHAUSTIVE BY TYPE: every company stage
// needs an entry, so adding a stage forces a status decision here and a missing
// one is a compile error — not a silent divergence. ("interview"/"final_interview"
// previously had no entry, so a company interview move left status as
// "under_client_review" and the recruiter kept seeing "Under review".) `null`
// means the stage deliberately leaves status unchanged: "viewed" still means
// "under review" to the recruiter.
export const COMPANY_STAGE_TO_STATUS: Record<CompanyStageValue, CandidateStatus | null> = {
    viewed: null,
    interview: "interview",
    final_interview: "final_interview",
    job_offer: "offer_in_progress",
    hired: "hired",
    rejected: "rejected_client",
};

// The next stage(s) a candidate at `current` may move to. `null` means the
// company has not viewed the candidate yet, so the only legal move is "viewed".
// "rejected", "hired" and "withdrawn" are terminal (reopen is a separate path).
export function allowedNextStages(current: string | null): string[] {
    switch (current) {
        case null:
            return ["viewed"];
        case "viewed":
            return ["interview", "rejected"];
        case "interview":
            return ["final_interview", "rejected"];
        case "final_interview":
            return ["job_offer", "rejected"];
        case "job_offer":
            return ["hired", "rejected"];
        case "hired":
            return [];
        case "rejected":
            return [];
        case "withdrawn":
            return [];
        default:
            return [];
    }
}

// True if `to` is a legal transition from `from`. Moving to the same stage is a
// no-op and always allowed.
export function canTransition(from: string | null, to: string): boolean {
    if (to === from) return true;
    return allowedNextStages(from).includes(to);
}

// Stages a rejected candidate may be reopened into. Never back to "viewed" (the
// company has already seen them) and never directly to a terminal stage.
export const REOPEN_TARGETS = ["interview", "final_interview", "job_offer"] as const;

export function canReopenTo(target: string): boolean {
    return (REOPEN_TARGETS as readonly string[]).includes(target);
}
