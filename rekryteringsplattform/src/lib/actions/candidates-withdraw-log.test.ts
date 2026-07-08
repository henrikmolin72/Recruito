import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Regression test for the admin-reported defect: a withdrawn candidate showed
// NO "Withdrawn" entry in the stage-history timeline. withdrawCandidate()
// updated candidates.status to 'candidate_withdrawn' without appending a
// candidate_stage_history row. It now logs action 'withdraw' with the human
// reason label. RED before the fix (logCandidateStageChange never called).
// ---------------------------------------------------------------------------

const logCandidateStageChange = vi.fn();

const job = { id: "J", title: "Cloud Engineer", company: { user_id: "CO" }, pipeline_stages: [] };
const candidate = {
    id: "C",
    status: "under_client_review",
    company_stage: "interview",
    company_viewed_at: "2020-01-01T00:00:00Z",
    current_pipeline_stage: null,
    job_id: "J",
    recruiter: { user_id: "REC" },
    mandate_id: "M",
};

function makeSupabase() {
    return {
        auth: { getUser: () => Promise.resolve({ data: { user: { id: "REC" } } }) },
        from(table: string) {
            if (table === "jobs") {
                return {
                    select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: job, error: null }) }) }),
                };
            }
            return {
                select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: candidate, error: null }) }) }),
            };
        },
    };
}

// withdrawCandidate writes the status flip via the admin client.
const adminUpdateEq = vi.fn(() => Promise.resolve({ error: null }));
function makeAdminClient() {
    return {
        from: () => ({ update: () => ({ eq: adminUpdateEq }) }),
    };
}

vi.mock("@/lib/supabase/server", () => ({ createClient: () => makeSupabase() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => makeAdminClient() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }));
vi.mock("@/lib/notifications/create", () => ({ createNotification: vi.fn() }));
vi.mock("@/lib/notifications/notify-admins", () => ({ notifyAdmins: vi.fn() }));
vi.mock("@/lib/candidate-stage-history", () => ({ logCandidateStageChange }));
vi.mock("@/lib/email/internal-notifications", () => ({ sendUserEmail: vi.fn() }));
vi.mock("@/lib/screening/run-evaluation", () => ({ runCandidateEvaluation: vi.fn() }));
vi.mock("@/lib/actions/require-admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/job-fill", () => ({
    markJobFilledAndReject: vi.fn(),
    maybeNudgeReopenForReview: vi.fn(),
    notifyRecruitersOfJobLifecycleChange: vi.fn(),
}));
vi.mock("@/lib/actions/placements", () => ({
    getPlacementByCandidateId: vi.fn(),
    sendPlacementInvoice: vi.fn(),
    recalculateRecruiterMetrics: vi.fn(),
}));

const { withdrawCandidate } = await import("./candidates");

beforeEach(() => {
    logCandidateStageChange.mockReset();
    adminUpdateEq.mockClear();
});

describe("withdrawCandidate stage-history logging", () => {
    it("appends a 'withdraw' audit row so the timeline shows the withdrawal", async () => {
        const res = await withdrawCandidate("C", "J", "candidate_accepted_another_offer");
        expect(res).toEqual({ success: true });

        expect(adminUpdateEq).toHaveBeenCalled();
        expect(logCandidateStageChange).toHaveBeenCalledTimes(1);
        expect(logCandidateStageChange.mock.calls[0][0]).toEqual({
            candidateId: "C",
            jobId: "J",
            fromStage: "interview",
            toStage: "withdrawn",
            action: "withdraw",
            changedBy: "REC",
            changedByRole: "recruiter",
            reason: "Candidate accepted another offer",
        });
    });

    it("does NOT log when the withdrawal is rejected (invalid reason)", async () => {
        const res = await withdrawCandidate("C", "J", "not_a_real_reason");
        expect(res).toHaveProperty("error");
        expect(logCandidateStageChange).not.toHaveBeenCalled();
    });
});
