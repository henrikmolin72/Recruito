import { describe, it, expect } from "vitest";
import { candidateInStage, classifyMandate, mandateExpiryDaysLeft, MANDATE_EXPIRY_DAYS } from "./mandate-stages";

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
