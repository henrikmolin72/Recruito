// Pure sort helper for the admin Candidate Screening table.
// Kept out of the client component so the comparator edge cases (nulls,
// numbers, dates, locale strings) are unit-testable in isolation.

export type SortColumn =
    | "name"
    | "jobTitle"
    | "companyName"
    | "recruiterName"
    | "aiMatchScore"
    | "status"
    | "createdAt"
    | "screening";

export type SortDirection = "asc" | "desc";

export type ScreeningCandidate = {
    id: string;
    name: string;
    currentTitle: string;
    aiMatchScore: number | null;
    status: string;
    createdAt: string;
    screenedAt: string | null;
    jobId: string | null;
    jobTitle: string;
    companyName: string;
    recruiterName: string;
};

// Nulls always sort last, regardless of direction (so "—" / not-yet-screened
// rows stay at the bottom rather than flipping to the top on desc).
function numCmp(a: number | null, b: number | null, dir: number): number {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return (a - b) * dir;
}

function strCmp(a: string, b: string, dir: number): number {
    return (a || "").localeCompare(b || "", undefined, { sensitivity: "base", numeric: true }) * dir;
}

function screenKey(c: ScreeningCandidate): number | null {
    return c.screenedAt ? Date.parse(c.screenedAt) : null;
}

// Returns a new array; never mutates the input (React state safety).
export function sortCandidates(
    rows: ScreeningCandidate[],
    column: SortColumn,
    direction: SortDirection,
): ScreeningCandidate[] {
    const dir = direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
        switch (column) {
            case "aiMatchScore":
                return numCmp(a.aiMatchScore, b.aiMatchScore, dir);
            case "createdAt":
                return (Date.parse(a.createdAt) - Date.parse(b.createdAt)) * dir;
            case "screening":
                return numCmp(screenKey(a), screenKey(b), dir);
            default:
                return strCmp(a[column], b[column], dir);
        }
    });
}
