import { describe, it, expect } from "vitest";
import { mandateExpiryDaysLeft, MANDATE_EXPIRY_DAYS } from "./mandate-stages";

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
