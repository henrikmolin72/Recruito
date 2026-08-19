import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Regression test for the client-reported defect: moving a candidate to the
// "Interview" stage (and every subsequent stage) sent NO notification to the
// recruiter OR to Recruito admins — only the "Viewed" first-open ping fired.
// updateCompanyStage now notifies BOTH parties on every forward company move.
//
// RED against the pre-fix code (interview took neither the recruiter-email nor
// the admin branch), GREEN once the unified advancement block exists.
// ---------------------------------------------------------------------------

const createNotification = vi.fn();
const notifyAdmins = vi.fn();

let candidateStage: string | null = "viewed"; // the candidate's CURRENT company_stage
let companyViewedAt: string | null = "2020-01-01T00:00:00Z"; // candidate's CURRENT company_viewed_at
let capturedPatch: Record<string, any> | null = null; // last candidates.update(...) patch

const job = { id: "J", title: "Electrical Engineer", company: { user_id: "CO" }, pipeline_stages: [] };
function candidate() {
    return {
        id: "C",
        status: "under_client_review",
        company_stage: candidateStage,
        company_viewed_at: companyViewedAt,
        current_pipeline_stage: null,
        job_id: "J",
        recruiter: { user_id: "REC" },
        mandate_id: "M",
        first_name: "Arqeen",
        last_name: "Valtor",
    };
}

function makeSupabase() {
    return {
        auth: { getUser: () => Promise.resolve({ data: { user: { id: "CO" } } }) },
        from(table: string) {
            if (table === "jobs") {
                return {
                    select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: job, error: null }) }) }),
                };
            }
            // candidates
            return {
                select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: candidate(), error: null }) }) }),
                update: (patch: Record<string, any>) => {
                    capturedPatch = patch;
                    return {
                        eq: () => ({
                            // stage write: .eq("id").eq("job_id")
                            eq: () => Promise.resolve({ error: null }),
                            // clearCompanyNextStepRequest: .eq("id").not(...)
                            not: () => Promise.resolve({ error: null }),
                        }),
                    };
                },
            };
        },
    };
}

vi.mock("@/lib/supabase/server", () => ({ createClient: () => makeSupabase() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: () => ({}) }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }));
vi.mock("@/lib/notifications/create", () => ({ createNotification }));
vi.mock("@/lib/notifications/notify-admins", () => ({ notifyAdmins }));
vi.mock("@/lib/candidate-stage-history", () => ({ logCandidateStageChange: vi.fn() }));
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

const { updateCompanyStage } = await import("./candidates");

beforeEach(() => {
    createNotification.mockReset();
    notifyAdmins.mockReset();
    candidateStage = "viewed";
    companyViewedAt = "2020-01-01T00:00:00Z";
    capturedPatch = null;
});

describe("updateCompanyStage notifications", () => {
    it("notifies the recruiter AND admins when the company moves to Interview", async () => {
        const res = await updateCompanyStage("C", "J", "interview");
        expect(res).toEqual({ success: true });

        // Recruiter got an in-app bell for the move (with its own email, since
        // interview has no separate richer email → skipEmail falsy).
        expect(createNotification).toHaveBeenCalledTimes(1);
        const [recipient, content] = createNotification.mock.calls[0];
        expect(recipient).toBe("REC");
        expect(content.titleKey).toBe("notif.companyStageMovedTitle");
        expect(content.params.stage).toBe("Interview");
        expect(content.skipEmail).toBeFalsy();

        // Admins were notified with the generic stage-moved message.
        expect(notifyAdmins).toHaveBeenCalledTimes(1);
        expect(notifyAdmins.mock.calls[0][0].titleKey).toBe("notif.adminCandidateStageMovedTitle");
    });

    it("notifies both parties on a subsequent stage (Job offer → Hired)", async () => {
        candidateStage = "job_offer";
        const res = await updateCompanyStage("C", "J", "hired");
        expect(res).toEqual({ success: true });

        // Recruiter bell fired; hired sends its own richer email so the bell's
        // generic email is suppressed (skipEmail true) to avoid double-emailing.
        expect(createNotification).toHaveBeenCalledTimes(1);
        expect(createNotification.mock.calls[0][0]).toBe("REC");
        expect(createNotification.mock.calls[0][1].skipEmail).toBe(true);

        // Admins keep the specific "hired" copy.
        expect(notifyAdmins).toHaveBeenCalledTimes(1);
        expect(notifyAdmins.mock.calls[0][0].titleKey).toBe("notif.adminCandidateHiredTitle");
    });

    it("stamps hired_at (and status_changed_at) when the company moves a candidate to hired", async () => {
        candidateStage = "job_offer";
        const res = await updateCompanyStage("C", "J", "hired");
        expect(res).toEqual({ success: true });

        expect(capturedPatch?.hired_at).toBeTruthy();
        expect(capturedPatch?.status_changed_at).toBeTruthy();
        expect(capturedPatch?.status).toBe("hired");
    });

    it("does not stamp status or timestamps on a first-open 'viewed' move", async () => {
        candidateStage = null;
        companyViewedAt = null; // genuinely unviewed, so this is really the first open
        const res = await updateCompanyStage("C", "J", "viewed");
        expect(res).toEqual({ success: true });

        // The first-open branch DOES stamp company_viewed_at (that's the point of it) —
        // it's status/status_changed_at that must stay untouched.
        expect(capturedPatch?.company_viewed_at).toBeTruthy();
        expect(capturedPatch?.status).toBeUndefined();
        expect(capturedPatch?.status_changed_at).toBeUndefined();
    });

    it("does not restamp hired_at/status_changed_at on a same-stage 'hired' replay (already hired)", async () => {
        candidateStage = "hired";
        const res = await updateCompanyStage("C", "J", "hired");
        expect(res).toEqual({ success: true });

        // "hired" -> "hired" is a same-stage no-op (canTransition allows to===from),
        // so mappedStatus is still non-null and status IS re-set on the patch — that's
        // fine. What must NOT happen is hired_at/status_changed_at getting clobbered
        // by a replayed/duplicate call on an already-hired candidate.
        expect(capturedPatch?.status).toBe("hired");
        expect(capturedPatch?.hired_at).toBeUndefined();
        expect(capturedPatch?.status_changed_at).toBeUndefined();
    });
});
