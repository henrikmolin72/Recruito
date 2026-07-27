import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// Pinning tests for createCandidateExtended's same-job duplicate block — the
// server boundary behind "Recruito flags automatically if a candidate has
// already been presented for the same job, regardless of recruiter". The block
// queries the job's candidates via the ADMIN client with no recruiter filter,
// so another recruiter's submission must trigger it too. Mocks mirror
// candidates-extended-cap.test.ts, extended past the cap and required-fields
// gates down to the duplicate check and (for the negative case) the insert.
// ---------------------------------------------------------------------------

const DUPLICATE_ERROR = {
    error: "A candidate with this email or LinkedIn URL has already been presented for this job.",
};
// The negative test proves the duplicate gate was PASSED by reaching the
// (stubbed, deterministically failing) insert.
const INSERT_STUB_ERROR = { error: "Något gick fel. Försök igen." };

// Existing candidates on the SAME job. recruiter_id is included only to
// document that these rows belong to a DIFFERENT recruiter — the block never
// filters on it.
let existingCandidates: Array<{
    id: string;
    recruiter_id: string;
    email: string | null;
    linkedin_url: string | null;
    status: string;
}> = [];

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
                                    data: { screening_questions: [], status: "active", max_candidates: 8 },
                                    error: null,
                                });
                            return Promise.resolve({ data: null, error: null });
                        },
                    }),
                }),
                // Reached only when the duplicate gate passes: stubbed insert
                // error stops the action before notifications / AI eval.
                insert: () => ({
                    select: () => ({
                        single: () => Promise.resolve({ data: null, error: { message: "stub" } }),
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
                select: (cols?: string) => ({
                    eq: () => {
                        if (table === "jobs" && cols === "id, company_id") {
                            return {
                                single: () =>
                                    Promise.resolve({ data: { id: "J", company_id: "C" }, error: null }),
                            };
                        }
                        if (table === "jobs") {
                            // select("id").eq("company_id", ...) — company job list
                            return Promise.resolve({ data: [{ id: "J" }], error: null });
                        }
                        // candidates: the cap query selects "status"; the duplicate
                        // query selects the identity columns.
                        const rows = (cols || "").includes("email")
                            ? existingCandidates
                            : existingCandidates.map((c) => ({ status: c.status }));
                        return Promise.resolve({ data: rows, error: null });
                    },
                    in: () => Promise.resolve({ data: [], error: null }),
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

// Complete, presentable submission — passes getMissingRequiredFields so the
// flow reaches the duplicate gate (screening_questions is [] in the job mock).
function fd(overrides: Record<string, string> = {}) {
    const f = new FormData();
    f.set("first_name", "Test");
    f.set("last_name", "Candidate");
    f.set("email", "Dup@Example.com"); // mixed case — the block must normalize
    f.set("employment_status", "employed");
    f.set("employment_reason", "Open to new roles");
    f.set("notice_period", "1_month");
    f.set("first_contact_date", "2026-07-01");
    f.set("contact_method", "phone");
    f.set("current_salary", "40000");
    f.set("expected_salary", "45000");
    for (const [k, v] of Object.entries(overrides)) f.set(k, v);
    return f;
}

describe("createCandidateExtended — same-job duplicate block (cross-recruiter)", () => {
    it("blocks when ANOTHER recruiter already presented the same email on this job", async () => {
        existingCandidates = [
            {
                id: "X",
                recruiter_id: "OTHER_RECRUITER",
                email: "dup@example.com",
                linkedin_url: null,
                status: "under_client_review",
            },
        ];
        const res = await createCandidateExtended("M1", fd());
        expect(res).toEqual(DUPLICATE_ERROR);
    });

    it("blocks on LinkedIn URL match even when the email differs", async () => {
        existingCandidates = [
            {
                id: "X",
                recruiter_id: "OTHER_RECRUITER",
                email: "other@example.com",
                linkedin_url: "https://linkedin.com/in/dup",
                status: "under_client_review",
            },
        ];
        const res = await createCandidateExtended(
            "M1",
            fd({ email: "new@example.com", linkedin_url: "HTTPS://linkedin.com/in/dup " }),
        );
        expect(res).toEqual(DUPLICATE_ERROR);
    });

    it("blocks even when the earlier same-job candidate was rejected", async () => {
        existingCandidates = [
            {
                id: "X",
                recruiter_id: "OTHER_RECRUITER",
                email: "dup@example.com",
                linkedin_url: null,
                status: "recruito_rejected",
            },
        ];
        const res = await createCandidateExtended("M1", fd());
        expect(res).toEqual(DUPLICATE_ERROR);
    });

    it("does NOT block on a draft with the same email (drafts are invisible)", async () => {
        existingCandidates = [
            {
                id: "X",
                recruiter_id: "OTHER_RECRUITER",
                email: "dup@example.com",
                linkedin_url: null,
                status: "draft",
            },
        ];
        const res = await createCandidateExtended("M1", fd());
        // Passed the duplicate gate and reached the stubbed insert.
        expect(res).toEqual(INSERT_STUB_ERROR);
    });
});
