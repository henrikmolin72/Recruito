import { describe, it, expect } from "vitest";
import { buildBiasReport, type BiasCandidate } from "./bias-report";

const c = (over: Partial<BiasCandidate> = {}): BiasCandidate => ({
    status: "submitted",
    ai_match_score: 70,
    years_experience: 4,
    location_city: "Stockholm",
    ...over,
});

describe("buildBiasReport", () => {
    it("counts screened and shortlisted, bucketing scores", () => {
        const r = buildBiasReport("job-1", [
            c({ ai_match_score: 10 }),
            c({ ai_match_score: 40 }),
            c({ ai_match_score: 90, status: "interview" }),
        ]);
        expect(r.total_screened).toBe(3);
        expect(r.total_shortlisted).toBe(1);
        expect(r.score_distribution).toEqual({ "0-25": 1, "26-50": 1, "76-100": 1 });
    });

    it("flags a group shortlisting far off the job average", () => {
        // Juniors: 0/6 shortlisted. Seniors: 6/6. Job average 50% → both deviate 50pp.
        const juniors = Array.from({ length: 6 }, () => c({ years_experience: 1 }));
        const seniors = Array.from({ length: 6 }, () => c({ years_experience: 12, status: "interview" }));
        const r = buildBiasReport("job-1", [...juniors, ...seniors]);

        const types = r.flags.map((f) => f.type);
        expect(types).toContain("experience_skew");
        expect(r.flags.every((f) => f.severity === "critical")).toBe(true);
        expect(r.experience_distribution["0-2"]).toEqual({ screened: 6, shortlisted: 0 });
        expect(r.experience_distribution["10+"]).toEqual({ screened: 6, shortlisted: 6 });
    });

    it("does not flag groups below the minimum size", () => {
        // 4 juniors all rejected, 4 seniors all shortlisted — same skew, too few to flag.
        const rows = [
            ...Array.from({ length: 4 }, () => c({ years_experience: 1 })),
            ...Array.from({ length: 4 }, () => c({ years_experience: 12, status: "interview" })),
        ];
        expect(buildBiasReport("job-1", rows).flags).toEqual([]);
    });

    it("does not flag an even spread", () => {
        const rows = Array.from({ length: 10 }, (_, i) =>
            c({ years_experience: i < 5 ? 1 : 12, status: i % 2 === 0 ? "interview" : "submitted" })
        );
        expect(buildBiasReport("job-1", rows).flags).toEqual([]);
    });

    it("never flags the unknown bucket", () => {
        const rows = [
            ...Array.from({ length: 6 }, () => c({ years_experience: null, location_city: null })),
            ...Array.from({ length: 6 }, () => c({ status: "interview" })),
        ];
        const r = buildBiasReport("job-1", rows);
        expect(r.experience_distribution.unknown.screened).toBe(6);
        expect(r.flags.some((f) => f.detail.startsWith("unknown"))).toBe(false);
    });
});
