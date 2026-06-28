import { describe, it, expect } from "vitest";
import { sortCandidates, type ScreeningCandidate } from "./sort-candidates";

function row(p: Partial<ScreeningCandidate>): ScreeningCandidate {
    return {
        id: p.id ?? "x",
        name: p.name ?? "",
        currentTitle: "",
        aiMatchScore: p.aiMatchScore ?? null,
        status: p.status ?? "",
        createdAt: p.createdAt ?? "2026-01-01T00:00:00Z",
        screenedAt: p.screenedAt ?? null,
        jobTitle: p.jobTitle ?? "",
        companyName: p.companyName ?? "",
        recruiterName: p.recruiterName ?? "",
    };
}

const ids = (rows: ScreeningCandidate[]) => rows.map((r) => r.id);

describe("sortCandidates", () => {
    it("sorts AI match numerically asc with nulls last", () => {
        const rows = [
            row({ id: "a", aiMatchScore: 82 }),
            row({ id: "b", aiMatchScore: null }),
            row({ id: "c", aiMatchScore: 18 }),
            row({ id: "d", aiMatchScore: 91 }),
        ];
        expect(ids(sortCandidates(rows, "aiMatchScore", "asc"))).toEqual(["c", "a", "d", "b"]);
    });

    it("keeps nulls last even on desc", () => {
        const rows = [
            row({ id: "a", aiMatchScore: 82 }),
            row({ id: "b", aiMatchScore: null }),
            row({ id: "c", aiMatchScore: 91 }),
        ];
        expect(ids(sortCandidates(rows, "aiMatchScore", "desc"))).toEqual(["c", "a", "b"]);
    });

    it("sorts Submitted by date, not string", () => {
        const rows = [
            row({ id: "old", createdAt: "2026-06-02T00:00:00Z" }),
            row({ id: "new", createdAt: "2026-06-25T00:00:00Z" }),
        ];
        expect(ids(sortCandidates(rows, "createdAt", "asc"))).toEqual(["old", "new"]);
        expect(ids(sortCandidates(rows, "createdAt", "desc"))).toEqual(["new", "old"]);
    });

    it("sorts names case-insensitively via locale compare", () => {
        const rows = [row({ id: "z", name: "zara" }), row({ id: "A", name: "Anna" })];
        expect(ids(sortCandidates(rows, "name", "asc"))).toEqual(["A", "z"]);
    });

    it("groups not-yet-screened rows last when sorting by Screening", () => {
        const rows = [
            row({ id: "pending", screenedAt: null }),
            row({ id: "screened", screenedAt: "2026-06-20T00:00:00Z" }),
        ];
        expect(ids(sortCandidates(rows, "screening", "asc"))).toEqual(["screened", "pending"]);
    });

    it("does not mutate the input array", () => {
        const rows = [row({ id: "a", name: "b" }), row({ id: "b", name: "a" })];
        const before = ids(rows);
        sortCandidates(rows, "name", "asc");
        expect(ids(rows)).toEqual(before);
    });
});
