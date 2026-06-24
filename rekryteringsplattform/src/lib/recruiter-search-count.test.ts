import { describe, it, expect } from "vitest";
import { countRecruitersWithoutDelivery } from "./recruiter-search-count";

describe("countRecruitersWithoutDelivery", () => {
    it("subtracts recruiters who delivered a screened candidate (the reported case: 6 − 1 = 5)", () => {
        const candidates = [
            { recruito_screened_at: "2026-06-20T00:00:00Z", recruiter_id: "rec-1" },
        ];
        expect(countRecruitersWithoutDelivery(6, candidates)).toBe(5);
    });

    it("dedupes by recruiter when one recruiter presented multiple candidates", () => {
        const candidates = [
            { recruito_screened_at: "2026-06-20T00:00:00Z", recruiter_id: "rec-1" },
            { recruito_screened_at: "2026-06-21T00:00:00Z", recruiter_id: "rec-1" },
        ];
        expect(countRecruitersWithoutDelivery(6, candidates)).toBe(5);
    });

    it("counts expired-without-delivery recruiters (no screened candidates → no subtraction)", () => {
        const candidates = [
            { recruito_screened_at: null, recruiter_id: "rec-2" }, // submitted but not screened
        ];
        expect(countRecruitersWithoutDelivery(4, candidates)).toBe(4);
    });

    it("ignores screened candidates with no recruiter_id", () => {
        const candidates = [
            { recruito_screened_at: "2026-06-20T00:00:00Z", recruiter_id: null },
        ];
        expect(countRecruitersWithoutDelivery(3, candidates)).toBe(3);
    });

    it("never goes negative", () => {
        const candidates = [
            { recruito_screened_at: "2026-06-20T00:00:00Z", recruiter_id: "rec-1" },
            { recruito_screened_at: "2026-06-20T00:00:00Z", recruiter_id: "rec-2" },
        ];
        expect(countRecruitersWithoutDelivery(1, candidates)).toBe(0);
    });

    it("handles empty candidates", () => {
        expect(countRecruitersWithoutDelivery(5, [])).toBe(5);
    });
});
