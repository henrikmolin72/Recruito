import { describe, it, expect } from "vitest";
import { mapRecruiterPerfRow, averageGuaranteeRate, isPerfSnapshotStale } from "./recruiter-metrics";

describe("mapRecruiterPerfRow", () => {
    const emptyRow = {
        total_placements: null,
        rating: null,
        perf_hire_rate: null,
        perf_avg_time_to_hire_days: null,
        perf_candidates_submitted: null,
        perf_candidates_hired: null,
        perf_active_placements: null,
        perf_guarantee_success_rate: null,
    };

    it("returns null guarantee rate when no guarantee ever completed (regression: showed 100%)", () => {
        expect(mapRecruiterPerfRow(emptyRow).guaranteeSuccessRate).toBeNull();
    });

    it("keeps a real guarantee rate once guarantees have completed", () => {
        const row = { ...emptyRow, perf_guarantee_success_rate: 100 };
        expect(mapRecruiterPerfRow(row).guaranteeSuccessRate).toBe(100);
        expect(mapRecruiterPerfRow({ ...emptyRow, perf_guarantee_success_rate: 0 }).guaranteeSuccessRate).toBe(0);
    });

    it("returns null avg time to hire when nobody has been hired (regression: showed 0 days)", () => {
        expect(mapRecruiterPerfRow(emptyRow).avgTimeToHireDays).toBeNull();
    });

    it("keeps a real avg time to hire once candidates have been hired", () => {
        expect(mapRecruiterPerfRow({ ...emptyRow, perf_avg_time_to_hire_days: 12 }).avgTimeToHireDays).toBe(12);
        expect(mapRecruiterPerfRow({ ...emptyRow, perf_avg_time_to_hire_days: 0 }).avgTimeToHireDays).toBe(0);
    });

    it("pins zero-defaults for the remaining metrics", () => {
        expect(mapRecruiterPerfRow(emptyRow)).toEqual({
            totalPlacements: 0,
            rating: 0,
            hireRate: 0,
            avgTimeToHireDays: null,
            candidatesSubmitted: 0,
            candidatesHired: 0,
            activePlacements: 0,
            guaranteeSuccessRate: null,
        });
    });
});

describe("isPerfSnapshotStale", () => {
    const now = new Date("2026-07-06T12:00:00Z");

    it("is stale when metrics were never calculated (regression: 0-of-0 shown while 8 presented)", () => {
        expect(isPerfSnapshotStale(null, now)).toBe(true);
    });

    it("is stale past the threshold, fresh within it", () => {
        expect(isPerfSnapshotStale("2026-07-06T10:59:59Z", now)).toBe(true);   // 1h+1s ago
        expect(isPerfSnapshotStale("2026-07-06T11:30:00Z", now)).toBe(false);  // 30min ago
    });

    it("treats an unparseable timestamp as stale", () => {
        expect(isPerfSnapshotStale("not-a-date", now)).toBe(true);
    });
});

describe("averageGuaranteeRate", () => {
    it("averages only recruiters that have guarantee data", () => {
        expect(averageGuaranteeRate([100, 50, null, null])).toBe(75);
    });

    it("returns null when no recruiter has guarantee data", () => {
        expect(averageGuaranteeRate([null, null])).toBeNull();
        expect(averageGuaranteeRate([])).toBeNull();
    });
});
