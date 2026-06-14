// Pure company-stage progression rules. NO server imports — safe to use in unit
// tests and (later) client UI. The server action (candidates.ts) enforces these
// before writing, and the timeline/panel UI reads them to decide which buttons
// to show.
//
// The company ladder is the linear happy path. Reject is available from every
// active rung; reopen (from rejected) is a separate path handled below.

export const COMPANY_STAGE_LADDER = [
    "viewed",
    "interview",
    "final_interview",
    "job_offer",
    "hired",
] as const;

export type CompanyStage = (typeof COMPANY_STAGE_LADDER)[number];

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
