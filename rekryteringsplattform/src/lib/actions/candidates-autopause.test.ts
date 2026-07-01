import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Regression test for the client-reported auto-pause defect: a job was pausing
// on its TOTAL approved-candidate count instead of the ACTIVE count, so once 8
// candidates had been approved the job flipped to "paused" even after most of
// them were rejected/withdrawn (screenshots: "Electrical Engineer" paused with 1
// active applicant). Auto-pause must exclude rejected/withdrawn via the same
// candidateOccupiesCapSlot contract every other cap count uses.
//
// The mock exposes BOTH shapes of the approved-count query (`count` for the old
// head:true path, `data` for the fixed status path) so this test is meaningful
// against the buggy code (RED) and the fixed code (GREEN).
// ---------------------------------------------------------------------------

let jobStatus = "active";
let maxCandidates = 8;
let approvedStatuses: string[] = [];
let jobUpdate: Record<string, unknown> | null = null;

function adminSelectChain(table: string, arg: string) {
    return {
        eq: () => ({
            single: () => {
                if (table === "candidates" && arg.includes("job:jobs"))
                    return Promise.resolve({ data: { job: { status: jobStatus } }, error: null });
                if (table === "candidates")
                    return Promise.resolve({
                        data: { first_name: "A", last_name: "B", job_id: "J", mandate_id: null },
                        error: null,
                    });
                if (table === "jobs")
                    return Promise.resolve({
                        data: { title: "T", status: jobStatus, max_candidates: maxCandidates, company: { user_id: "CO" } },
                        error: null,
                    });
                return Promise.resolve({ data: null, error: null });
            },
            // approved-candidate count query: .eq("job_id").not("recruito_screened_at", "is", null)
            not: () =>
                Promise.resolve({
                    count: approvedStatuses.length, // old (buggy) path read this
                    data: approvedStatuses.map((s) => ({ status: s })), // fixed path reads this
                    error: null,
                }),
        }),
    };
}

function makeAdmin() {
    return {
        from(table: string) {
            return {
                select: (arg: string) => adminSelectChain(table, arg),
                update: (payload: Record<string, unknown>) => ({
                    eq: () => {
                        if (table === "jobs") jobUpdate = payload;
                        return Promise.resolve({ error: null });
                    },
                }),
            };
        },
    };
}

function makeSupabase() {
    return {
        from: () => ({
            update: () => ({ eq: () => ({ is: () => Promise.resolve({ error: null }) }) }),
        }),
    };
}

vi.mock("@/lib/actions/require-admin", () => ({
    requireAdmin: () => Promise.resolve({ supabase: makeSupabase(), user: { id: "U" } }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => makeAdmin() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn }));
vi.mock("@/lib/notifications/create", () => ({ createNotification: vi.fn() }));
vi.mock("@/lib/job-fill", () => ({
    notifyRecruitersOfJobLifecycleChange: vi.fn(),
    markJobFilledAndReject: vi.fn(),
    maybeNudgeReopenForReview: vi.fn(),
}));

const { markCandidateRecruitoScreened } = await import("./candidates");

beforeEach(() => {
    jobStatus = "active";
    maxCandidates = 8;
    approvedStatuses = [];
    jobUpdate = null;
});

describe("markCandidateRecruitoScreened — auto-pause counts ACTIVE approved candidates only", () => {
    it("pauses once the cap is reached by active approved candidates", async () => {
        approvedStatuses = Array(8).fill("under_client_review");
        await markCandidateRecruitoScreened("C1");
        expect(jobUpdate).toEqual({ status: "paused", pause_reason: "Candidate Limit Reached" });
    });

    it("does NOT pause when rejected/withdrawn approved candidates pad the count (7 active + 1 rejected < 8)", async () => {
        approvedStatuses = [...Array(7).fill("under_client_review"), "rejected_client"];
        await markCandidateRecruitoScreened("C1");
        expect(jobUpdate).toBeNull();
    });

    it("does NOT pause a job that is 8 total but only 1 active (the reported case)", async () => {
        approvedStatuses = [
            "under_client_review",
            "rejected_client",
            "rejected_client",
            "rejected_client",
            "candidate_withdrawn",
            "rejected_client",
            "rejected_client",
            "offer_declined",
        ];
        await markCandidateRecruitoScreened("C1");
        expect(jobUpdate).toBeNull();
    });
});
