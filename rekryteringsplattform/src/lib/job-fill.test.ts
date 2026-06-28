import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Tests for the job-fill cascade helpers: who gets auto-rejected on close/fill,
// and when the "consider reopening" nudge fires. Uses a chainable Supabase
// admin-client mock that records the writes each helper issues.
// ---------------------------------------------------------------------------

let jobRow: any;
let candidateRows: any[];
let recruiterRows: any[];
const jobUpdates: Array<{ patch: any }> = [];
const candidateUpdates: Array<{ patch: any; inIds: any }> = [];

function makeClient() {
    function from(table: string) {
        let op: "select" | "update" = "select";
        let patch: any = null;
        let inIds: any = null;
        const selectData = () =>
            table === "jobs" ? jobRow : table === "candidates" ? candidateRows : table === "recruiters" ? recruiterRows : null;
        const chain: any = {
            select: () => chain,
            update: (p: any) => { op = "update"; patch = p; return chain; },
            eq: () => chain,
            in: (_col: string, vals: any) => { inIds = vals; return chain; },
            single: async () => ({ data: selectData(), error: null }),
            maybeSingle: async () => ({ data: selectData(), error: null }),
            then: (resolve: any, reject: any) => {
                if (op === "update") {
                    if (table === "jobs") jobUpdates.push({ patch });
                    else candidateUpdates.push({ patch, inIds });
                    return Promise.resolve({ data: null, error: null }).then(resolve, reject);
                }
                return Promise.resolve({ data: selectData(), error: null }).then(resolve, reject);
            },
        };
        return chain;
    }
    return { from };
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => makeClient() }));
vi.mock("@/lib/notifications/create", () => ({ createNotification: vi.fn() }));
vi.mock("@/lib/candidate-stage-history", () => ({ logCandidateStageChange: vi.fn() }));
vi.mock("@/lib/email/internal-notifications", () => ({ sendUserEmail: vi.fn() }));
vi.mock("@/lib/email/email-templates", () => ({ jobLifecycleEmail: () => "<html></html>" }));
vi.mock("@/lib/candidate-workflow", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/candidate-workflow")>();
    return {
        ...actual,
        statusChangeTimestampPatch: () => ({ status_changed_at: "2025-01-01T00:00:00.000Z" }),
    };
});

import { rejectRemainingCandidates, markJobFilledAndReject, maybeNudgeReopenForReview } from "./job-fill";
import { createNotification } from "@/lib/notifications/create";

const notify = vi.mocked(createNotification);

beforeEach(() => {
    jobUpdates.length = 0;
    candidateUpdates.length = 0;
    notify.mockClear();
    jobRow = { title: "Dev", status: "filled", reopen_nudge_sent_at: null, company: { user_id: "co-1" } };
    recruiterRows = [{ id: "r1", user_id: "u1" }];
});

describe("rejectRemainingCandidates", () => {
    it("rejects all non-hired candidates except the hired one and already-rejected ones", async () => {
        candidateRows = [
            { id: "c1", recruiter_id: "r1", status: "under_client_review" },
            { id: "c2", recruiter_id: "r1", status: "interview_stage_1" },
            { id: "won", recruiter_id: "r2", status: "hired" },          // protected
            { id: "c3", recruiter_id: "r3", status: "rejected_client" }, // already rejected
        ];

        const count = await rejectRemainingCandidates("j1", { exceptCandidateId: "won" });

        expect(count).toBe(2);
        expect(candidateUpdates).toHaveLength(1);
        expect(candidateUpdates[0].patch.status).toBe("rejected_client");
        expect([...candidateUpdates[0].inIds].sort()).toEqual(["c1", "c2"]);
    });

    it("never overwrites terminal or hired-pipeline statuses", async () => {
        candidateRows = [
            { id: "c1", recruiter_id: "r1", status: "under_client_review" },
            { id: "w1", recruiter_id: "r1", status: "candidate_withdrawn" }, // terminal
            { id: "d1", recruiter_id: "r2", status: "duplicate_rejected" },  // terminal
            { id: "g1", recruiter_id: "r2", status: "guarantee_tracking" },  // hired pipeline
        ];

        const count = await rejectRemainingCandidates("j1");

        expect(count).toBe(1);
        expect(candidateUpdates).toHaveLength(1);
        expect(candidateUpdates[0].inIds).toEqual(["c1"]);
    });

    it("writes nothing when only hired/already-rejected candidates remain", async () => {
        candidateRows = [
            { id: "won", recruiter_id: "r2", status: "hired" },
            { id: "c3", recruiter_id: "r3", status: "rejected_client" },
        ];
        const count = await rejectRemainingCandidates("j1");
        expect(count).toBe(0);
        expect(candidateUpdates).toHaveLength(0);
    });
});

describe("markJobFilledAndReject", () => {
    it("sets the job to filled (from active) and rejects the others", async () => {
        jobRow = { title: "Dev", status: "active", reopen_nudge_sent_at: null, company: { user_id: "co-1" } };
        candidateRows = [
            { id: "won", recruiter_id: "r1", status: "hired" },
            { id: "c1", recruiter_id: "r1", status: "offer_in_progress" },
        ];

        await markJobFilledAndReject("j1", "won");

        expect(jobUpdates.some((u) => u.patch.status === "filled")).toBe(true);
        expect(candidateUpdates[0].inIds).toEqual(["c1"]);
    });
});

describe("maybeNudgeReopenForReview", () => {
    const reviewMix = () => [
        { status: "under_client_review" },
        { status: "interview_stage_1" },
        { status: "submitted" },        // 3 still to review
        { status: "rejected_client" },  // terminal
        { status: "hired" },            // protected
    ];

    it("nudges once when paused with <= 3 left to review", async () => {
        jobRow = { title: "Dev", status: "paused", reopen_nudge_sent_at: null, company: { user_id: "co-1" } };
        candidateRows = reviewMix();

        await maybeNudgeReopenForReview("j1");

        expect(jobUpdates.some((u) => u.patch.reopen_nudge_sent_at)).toBe(true);
        expect(notify).toHaveBeenCalledTimes(1);
        expect(notify.mock.calls[0][1]).toMatchObject({ titleKey: "notif.reopenNudgeTitle", params: { count: 3 } });
    });

    it("does not nudge an active job", async () => {
        jobRow = { title: "Dev", status: "active", reopen_nudge_sent_at: null, company: { user_id: "co-1" } };
        candidateRows = reviewMix();
        await maybeNudgeReopenForReview("j1");
        expect(notify).not.toHaveBeenCalled();
        expect(jobUpdates).toHaveLength(0);
    });

    it("does not nudge twice (already stamped)", async () => {
        jobRow = { title: "Dev", status: "paused", reopen_nudge_sent_at: "2025-01-01T00:00:00.000Z", company: { user_id: "co-1" } };
        candidateRows = reviewMix();
        await maybeNudgeReopenForReview("j1");
        expect(notify).not.toHaveBeenCalled();
    });

    it("does not nudge when more than 3 remain to review", async () => {
        jobRow = { title: "Dev", status: "paused", reopen_nudge_sent_at: null, company: { user_id: "co-1" } };
        candidateRows = [
            { status: "under_client_review" }, { status: "interview_stage_1" },
            { status: "submitted" }, { status: "offer_in_progress" },
        ];
        await maybeNudgeReopenForReview("j1");
        expect(notify).not.toHaveBeenCalled();
    });
});
