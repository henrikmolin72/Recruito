import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// Regression tests for createCandidateExtended's submission boundary — the two
// client-reported defects: a paused job must reject new submissions, and a job
// at its candidate cap must reject further submissions (was: 9/8, 10/8 slipping
// through because no cap check existed). Both return early, so the mocks only
// need the chains up to those guards.
// ---------------------------------------------------------------------------

let jobStatus = "active";
let maxCandidates = 8;
let capStatuses: string[] = [];

function makeClient() {
    return {
        auth: { getUser: () => Promise.resolve({ data: { user: { id: "U" } } }) },
        from(table: string) {
            return {
                select: () => ({
                    eq: () => ({
                        single: () => {
                            if (table === "job_mandates")
                                return Promise.resolve({ data: { job_id: "J", recruiter_id: "R" }, error: null });
                            if (table === "recruiters")
                                return Promise.resolve({ data: { id: "R" }, error: null });
                            if (table === "jobs")
                                return Promise.resolve({
                                    data: { screening_questions: [], status: jobStatus, max_candidates: maxCandidates },
                                    error: null,
                                });
                            return Promise.resolve({ data: null, error: null });
                        },
                    }),
                }),
            };
        },
    };
}

function makeAdminClient() {
    return {
        from(table: string) {
            return {
                select: () => ({
                    // admin.from("candidates").select("status").eq("job_id", ...) → array
                    eq: () =>
                        Promise.resolve({
                            data: table === "candidates" ? capStatuses.map((s) => ({ status: s })) : null,
                            error: null,
                        }),
                }),
            };
        },
    };
}

vi.mock("@/lib/supabase/server", () => ({ createClient: () => makeClient() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => makeAdminClient() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("REDIRECT"); } }));

const { createCandidateExtended } = await import("./candidates-extended");

function fd() {
    const f = new FormData();
    f.set("first_name", "Test");
    f.set("last_name", "Candidate");
    f.set("email", "test@example.com");
    return f;
}

describe("createCandidateExtended — submission boundary", () => {
    it("rejects a referral to a paused job (Defect: paused job still accepted submits)", async () => {
        jobStatus = "paused";
        maxCandidates = 8;
        capStatuses = [];
        const res = await createCandidateExtended("M1", fd());
        expect(res).toEqual({ error: "This job is not currently accepting candidates." });
    });

    it("rejects a referral when the job is already at its candidate cap (Defect: 9/8, 10/8)", async () => {
        jobStatus = "active";
        maxCandidates = 8;
        capStatuses = Array(8).fill("under_client_review"); // 8 occupied slots == cap
        const res = await createCandidateExtended("M1", fd());
        expect(res).toEqual({
            error: "This job has reached its candidate limit and is no longer accepting submissions.",
        });
    });

    it("does NOT block at the cap when a slot was freed by a rejection (7 active + 1 rejected < 8)", async () => {
        jobStatus = "active";
        maxCandidates = 8;
        capStatuses = [...Array(7).fill("under_client_review"), "recruito_rejected"];
        const res = await createCandidateExtended("M1", fd());
        // The cap gate passes (countAgainstCap = 7 < 8); the call proceeds past it.
        // We only assert the cap error is NOT returned — later steps are out of scope.
        expect(res).not.toEqual({
            error: "This job has reached its candidate limit and is no longer accepting submissions.",
        });
    });
});
