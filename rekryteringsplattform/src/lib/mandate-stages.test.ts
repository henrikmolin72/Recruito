import { describe, it, expect } from "vitest";
import {
    candidateInStage,
    classifyMandate,
    computeJobProcessStats,
    countActiveRecruiters,
    isMandateLiveActive,
    mandateExpiryDaysLeft,
    MANDATE_EXPIRY_DAYS,
    REFERRAL_BLOCKED_JOB_STATUSES,
    type ExpiryCandidate,
} from "./mandate-stages";
import { countCandidatesAgainstCap } from "./candidate-workflow";

const DAY = 86_400_000;
const NOW = new Date("2026-05-31T12:00:00.000Z").getTime();
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

describe("mandateExpiryDaysLeft", () => {
    it("returns null when there is no claim date", () => {
        expect(mandateExpiryDaysLeft({ claimedAt: null, candidates: [], now: NOW })).toBeNull();
    });

    it("counts down from claim when no candidates were submitted", () => {
        const result = mandateExpiryDaysLeft({ claimedAt: iso(2 * DAY), candidates: [], now: NOW });
        expect(result).toBe(MANDATE_EXPIRY_DAYS - 2); // 8 days left
    });

    it("suspends expiry while a live candidate exists", () => {
        const result = mandateExpiryDaysLeft({
            claimedAt: iso(20 * DAY),
            candidates: [{ status: "under_client_review", status_changed_at: iso(15 * DAY) }],
            now: NOW,
        });
        expect(result).toBeNull();
    });

    it("a single interview candidate also suspends expiry", () => {
        const result = mandateExpiryDaysLeft({
            claimedAt: iso(30 * DAY),
            candidates: [{ status: "interview_stage_1", status_changed_at: iso(1 * DAY) }],
            now: NOW,
        });
        expect(result).toBeNull();
    });

    it("restarts the 10-day window from the last rejection when all are rejected", () => {
        const result = mandateExpiryDaysLeft({
            claimedAt: iso(40 * DAY),
            candidates: [
                { status: "rejected_client", status_changed_at: iso(5 * DAY) },
                { status: "recruito_rejected", status_changed_at: iso(2 * DAY) }, // most recent
            ],
            now: NOW,
        });
        expect(result).toBe(MANDATE_EXPIRY_DAYS - 2); // 8 days left, from the 2-day-ago rejection
    });

    it("reports expired (<=0) when the last rejection is older than the window", () => {
        const result = mandateExpiryDaysLeft({
            claimedAt: iso(40 * DAY),
            candidates: [{ status: "rejected_interview", status_changed_at: iso(12 * DAY) }],
            now: NOW,
        });
        expect(result).toBeLessThanOrEqual(0);
    });

    it("a non-rejection state (withdrawn) keeps the mandate alive", () => {
        const result = mandateExpiryDaysLeft({
            claimedAt: iso(40 * DAY),
            candidates: [{ status: "candidate_withdrawn", status_changed_at: iso(20 * DAY) }],
            now: NOW,
        });
        expect(result).toBeNull();
    });
});

// Single source of truth for "active recruiter": the company Jobs list count and
// the job-detail Recruiters-tab count both run through these, so they can't drift.
describe("isMandateLiveActive", () => {
    it("is active for a fresh claim with is_active=true", () => {
        expect(isMandateLiveActive({ isActive: true, claimedAt: iso(2 * DAY) }, [], NOW)).toBe(true);
    });

    it("is not active when is_active=false (released), even within the timer", () => {
        expect(isMandateLiveActive({ isActive: false, claimedAt: iso(2 * DAY) }, [], NOW)).toBe(false);
    });

    it("is not active once the no-delivery timer has run out", () => {
        expect(isMandateLiveActive({ isActive: true, claimedAt: iso(20 * DAY) }, [], NOW)).toBe(false);
    });

    it("stays active while a live candidate suspends the timer, however old the claim", () => {
        const cands: ExpiryCandidate[] = [{ status: "under_client_review", status_changed_at: iso(15 * DAY) }];
        expect(isMandateLiveActive({ isActive: true, claimedAt: iso(40 * DAY) }, cands, NOW)).toBe(true);
    });
});

describe("countActiveRecruiters", () => {
    const map = (e: Record<string, ExpiryCandidate[]>) => new Map(Object.entries(e));

    it("counts only recruiters with a live mandate", () => {
        const mandates = [
            { recruiterId: "r1", isActive: true, claimedAt: iso(2 * DAY) },   // active
            { recruiterId: "r2", isActive: false, claimedAt: iso(2 * DAY) },  // released
            { recruiterId: "r3", isActive: true, claimedAt: iso(20 * DAY) },  // timer-expired
        ];
        expect(countActiveRecruiters(mandates, new Map(), NOW)).toBe(1);
    });

    it("counts a timer-expired recruiter as active when a live candidate suspends the timer", () => {
        const mandates = [{ recruiterId: "r3", isActive: true, claimedAt: iso(20 * DAY) }];
        const cands = map({ r3: [{ status: "interview_stage_1", status_changed_at: iso(1 * DAY) }] });
        expect(countActiveRecruiters(mandates, cands, NOW)).toBe(1);
    });

    it("dedupes multiple mandate rows per recruiter (active if any row is live)", () => {
        const mandates = [
            { recruiterId: "r4", isActive: false, claimedAt: iso(30 * DAY) }, // old expired cycle
            { recruiterId: "r4", isActive: true, claimedAt: iso(1 * DAY) },   // fresh re-claim
        ];
        expect(countActiveRecruiters(mandates, new Map(), NOW)).toBe(1);
    });

    it("ignores rows without a recruiter id and counts nothing for an empty list", () => {
        expect(countActiveRecruiters([{ recruiterId: null, isActive: true, claimedAt: iso(1 * DAY) }], new Map(), NOW)).toBe(0);
        expect(countActiveRecruiters([], new Map(), NOW)).toBe(0);
    });
});

// A paused job must reject new referrals (recruiter Refer button, new-candidate
// page guard, and the createCandidateExtended server boundary all key on this)
// while still classifying as an Active mandate (classifyMandate keeps it there).
describe("REFERRAL_BLOCKED_JOB_STATUSES", () => {
    it("blocks paused plus the client-ended statuses", () => {
        for (const s of ["paused", "closed", "filled", "cancelled"]) {
            expect(REFERRAL_BLOCKED_JOB_STATUSES.has(s)).toBe(true);
        }
    });

    it("still accepts referrals on an active job", () => {
        expect(REFERRAL_BLOCKED_JOB_STATUSES.has("active")).toBe(false);
    });

    it("keeps a paused mandate in the Active tab (paused gates referrals, not bucketing)", () => {
        expect(classifyMandate({ status: "paused", candidates: [] })).toBe("active");
        expect(REFERRAL_BLOCKED_JOB_STATUSES.has("paused")).toBe(true);
    });
});

// Workflow spec: Final Interview and Withdrawn are their own tabs.
describe("candidateInStage", () => {
    it("buckets final_interview into its own stage, not interview", () => {
        expect(candidateInStage({ status: "final_interview" }, "final_interview")).toBe(true);
        expect(candidateInStage({ status: "final_interview" }, "interview")).toBe(false);
        expect(candidateInStage({ status: "interview_stage_2" }, "interview")).toBe(true);
        expect(candidateInStage({ status: "interview_stage_2" }, "final_interview")).toBe(false);
    });

    it("buckets candidate_withdrawn into withdrawn, not rejected", () => {
        expect(candidateInStage({ status: "candidate_withdrawn" }, "withdrawn")).toBe(true);
        expect(candidateInStage({ status: "candidate_withdrawn" }, "rejected")).toBe(false);
        expect(candidateInStage({ status: "rejected_client" }, "rejected")).toBe(true);
        expect(candidateInStage({ status: "rejected_client" }, "withdrawn")).toBe(false);
    });
});

// The "Expired" tab was removed: timer-expired mandates are released by the cron
// (is_active=false) and drop out of the recruiter's mandate query. These tests
// pin that there is no "expired" bucket — a timer-expired-but-still-active
// mandate falls into "active", with the per-row expiry UI carrying the signal.
describe("classifyMandate", () => {
    it("classifies a mandate with a hired candidate as hired", () => {
        expect(classifyMandate({ status: "active", candidates: [{ status: "hired" }] })).toBe("hired");
    });

    it("classifies a client-closed/filled/cancelled job as closed", () => {
        expect(classifyMandate({ status: "closed", candidates: [] })).toBe("closed");
        expect(classifyMandate({ status: "filled", candidates: [] })).toBe("closed");
        expect(classifyMandate({ status: "cancelled", candidates: [] })).toBe("closed");
    });

    it("classifies a fresh open mandate as active", () => {
        expect(classifyMandate({ status: "active", candidates: [] })).toBe("active");
    });

    it("classifies a timer-expired but still-open mandate as active (no expired bucket)", () => {
        // A mandate whose every candidate was rejected (timer would have run out)
        // is no longer its own bucket — it stays in active until the cron releases it.
        expect(classifyMandate({ status: "active", candidates: [{ status: "rejected_client" }] })).toBe("active");
    });

    it("prioritizes hired over a client-closed job status", () => {
        expect(classifyMandate({ status: "filled", candidates: [{ status: "hired" }] })).toBe("hired");
    });
});

describe("computeJobProcessStats", () => {
    it("excludes drafts from every bucket", () => {
        expect(
            computeJobProcessStats([{ status: "draft" }, { status: "submitted" }]),
        ).toEqual({ presented: 1, inProcess: 1, inInterview: 0, released: 0 });
    });

    it("presented matches the admin cap badge: rejected/withdrawn release the slot", () => {
        const stats = computeJobProcessStats([
            { status: "under_client_review", recruito_screened_at: "2026-07-01" },
            { status: "rejected_client" },
            { status: "candidate_withdrawn" },
        ]);
        expect(stats.presented).toBe(1);
        expect(stats.released).toBe(2);
    });

    it("splits interview stages out of in-process", () => {
        expect(
            computeJobProcessStats([
                { status: "interview_stage_1" },
                { status: "final_interview" },
                { status: "submitted" },
            ]),
        ).toEqual({ presented: 3, inProcess: 1, inInterview: 2, released: 0 });
    });

    it("keeps hired candidates presented; offer_declined releases", () => {
        expect(
            computeJobProcessStats([{ status: "hired" }, { status: "offer_declined" }]),
        ).toEqual({ presented: 1, inProcess: 1, inInterview: 0, released: 1 });
    });

    it("agrees with countCandidatesAgainstCap for any status mix", () => {
        const rows = [
            "draft", "submitted", "rejected_client", "interview_stage_2",
            "hired", "candidate_withdrawn", "offer_declined", "recruito_rejected",
        ].map((status) => ({ status }));
        expect(computeJobProcessStats(rows).presented).toBe(
            countCandidatesAgainstCap(rows.map((r) => r.status)),
        );
    });

    // Client report 2026-07-02 (Electrical Engineer): admin badge 1/8 while the
    // old panel showed Presented 12 / In process 2 / Rejected 10 — the 12th row
    // (a draft or a withdrawal) leaked into "In process". Both variants must now
    // land outside it, and Presented must equal the admin badge's 1.
    it("reproduces the 2026-07-02 client report: 10 rejected + 1 active + 1 stray row", () => {
        const rejected = [
            "rejected_client", "rejected_client", "rejected_interview", "recruito_rejected",
            "rejected", "rejected", "rejected_client", "rejected_interview", "recruito_rejected", "rejected_client",
        ].map((status) => ({ status }));
        expect(
            computeJobProcessStats([...rejected, { status: "under_client_review" }, { status: "draft" }]),
        ).toEqual({ presented: 1, inProcess: 1, inInterview: 0, released: 10 });
        expect(
            computeJobProcessStats([...rejected, { status: "under_client_review" }, { status: "candidate_withdrawn" }]),
        ).toEqual({ presented: 1, inProcess: 1, inInterview: 0, released: 11 });
    });
});
