import { describe, it, expect } from "vitest";
import { mapRecruiterPerfRow, averageGuaranteeRate } from "./recruiter-metrics";

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

    it("pins zero-defaults for the remaining metrics", () => {
        expect(mapRecruiterPerfRow(emptyRow)).toEqual({
            totalPlacements: 0,
            rating: 0,
            hireRate: 0,
            avgTimeToHireDays: 0,
            candidatesSubmitted: 0,
            candidatesHired: 0,
            activePlacements: 0,
            guaranteeSuccessRate: null,
        });
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
