import { describe, it, expect } from "vitest";
import { countRecruitersWithoutDelivery } from "./recruiter-search-count";

describe("countRecruitersWithoutDelivery", () => {
    it("subtracts recruiters who delivered a screened candidate (1 of 6 delivered → 5)", () => {
        const mandates = ["r1", "r2", "r3", "r4", "r5", "r6"];
        const candidates = [
            { recruito_screened_at: "2026-06-20T00:00:00Z", recruiter_id: "r1" },
        ];
        expect(countRecruitersWithoutDelivery(mandates, candidates)).toBe(5);
    });

    it("regression (prod 'Electrical Engineer'): 8 mandate rows / 6 distinct recruiters, 2 delivered → 4", () => {
        // job_mandates had 2 duplicate/stale rows: 8 rows, 6 distinct recruiters.
        const mandates = ["r1", "r2", "r3", "r4", "r5", "r6", "r1", "r2"];
        const candidates = [
            { recruito_screened_at: "2026-06-14T00:00:00Z", recruiter_id: "r1" },
            { recruito_screened_at: "2026-06-25T14:33:00Z", recruiter_id: "r1" }, // same recruiter, 2nd screen
            { recruito_screened_at: "2026-06-25T15:43:00Z", recruiter_id: "r2" },
            { recruito_screened_at: null, recruiter_id: "r2" }, // draft, not a delivery
            { recruito_screened_at: null, recruiter_id: "r7" }, // recruito_rejected, not screened
        ];
        expect(countRecruitersWithoutDelivery(mandates, candidates)).toBe(4);
    });

    it("dedupes mandate rows by recruiter_id (duplicate rows don't inflate the count)", () => {
        const mandates = ["r1", "r1", "r2"];
        expect(countRecruitersWithoutDelivery(mandates, [])).toBe(2);
    });

    it("dedupes deliveries by recruiter when one recruiter presented multiple candidates", () => {
        const mandates = ["r1", "r2", "r3", "r4", "r5", "r6"];
        const candidates = [
            { recruito_screened_at: "2026-06-20T00:00:00Z", recruiter_id: "r1" },
            { recruito_screened_at: "2026-06-21T00:00:00Z", recruiter_id: "r1" },
        ];
        expect(countRecruitersWithoutDelivery(mandates, candidates)).toBe(5);
    });

    it("counts expired-without-delivery recruiters (no screened candidates → no subtraction)", () => {
        const mandates = ["r1", "r2", "r3", "r4"];
        const candidates = [
            { recruito_screened_at: null, recruiter_id: "r2" }, // submitted but not screened
        ];
        expect(countRecruitersWithoutDelivery(mandates, candidates)).toBe(4);
    });

    it("ignores screened candidates with no recruiter_id (can't attribute → no subtraction)", () => {
        const mandates = ["r1", "r2", "r3"];
        const candidates = [
            { recruito_screened_at: "2026-06-20T00:00:00Z", recruiter_id: null },
        ];
        expect(countRecruitersWithoutDelivery(mandates, candidates)).toBe(3);
    });

    it("a delivering recruiter not in the mandate set neither subtracts nor counts", () => {
        const mandates = ["r1"];
        const candidates = [
            { recruito_screened_at: "2026-06-20T00:00:00Z", recruiter_id: "r1" },
            { recruito_screened_at: "2026-06-20T00:00:00Z", recruiter_id: "r2" }, // delivered but released mandate
        ];
        expect(countRecruitersWithoutDelivery(mandates, candidates)).toBe(0);
    });

    it("ignores null/undefined mandate ids", () => {
        const mandates = ["r1", null, undefined, "r2"];
        expect(countRecruitersWithoutDelivery(mandates, [])).toBe(2);
    });

    it("handles empty inputs", () => {
        expect(countRecruitersWithoutDelivery([], [])).toBe(0);
    });
});
