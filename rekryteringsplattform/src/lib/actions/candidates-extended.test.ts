import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Tests for candidates-extended.ts — focused on deleteDraftCandidate:
// (1) auth gate, (2) IDOR ownership check, (3) status guard, (4) happy path.
// ---------------------------------------------------------------------------

let userRow: any;
let recruiterRow: any;
let candidateRow: any;
let deleteError: any = null;

function makeClient() {
    function from(table: string) {
        return {
            select: () => ({
                eq: (_col: string, _val: any) => ({
                    single: () =>
                        Promise.resolve(
                            table === "recruiters"
                                ? { data: recruiterRow, error: recruiterRow ? null : { message: "not found" } }
                                : { data: null, error: null }
                        ),
                }),
            }),
            delete: () => ({
                eq: (_c1: string, _v1: any) => ({
                    eq: (_c2: string, _v2: any) => ({
                        eq: (_c3: string, _v3: any) =>
                            Promise.resolve({ error: deleteError }),
                    }),
                }),
            }),
        };
    }
    return {
        auth: { getUser: () => Promise.resolve({ data: { user: userRow } }) },
        from,
    };
}

function makeAdminClient() {
    return {
        from: (_table: string) => ({
            delete: () => ({
                eq: (_c1: string, _v1: any) => ({
                    eq: (_c2: string, _v2: any) => ({
                        eq: (_c3: string, _v3: any) =>
                            Promise.resolve({ error: deleteError }),
                    }),
                }),
            }),
        }),
    };
}

vi.mock("@/lib/supabase/server", () => ({ createClient: () => makeClient() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => makeAdminClient() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { deleteDraftCandidate } = await import("./candidates-extended");

describe("deleteDraftCandidate", () => {
    beforeEach(() => {
        userRow = { id: "user-1" };
        recruiterRow = { id: "rec-1" };
        candidateRow = { id: "cand-1", recruiter_id: "rec-1", status: "draft" };
        deleteError = null;
    });

    it("returns error when not authenticated", async () => {
        userRow = null;
        const result = await deleteDraftCandidate("cand-1");
        expect(result).toHaveProperty("error");
    });

    it("returns error when recruiter record not found (not a recruiter account)", async () => {
        recruiterRow = null;
        const result = await deleteDraftCandidate("cand-1");
        expect(result).toHaveProperty("error");
    });

    it("returns error when Supabase delete fails (simulates IDOR or wrong status)", async () => {
        // The delete query includes .eq("recruiter_id", recruiter.id).eq("status","draft"),
        // so a mismatch returns an error from the DB — simulated here.
        deleteError = { message: "No rows matched" };
        const result = await deleteDraftCandidate("cand-1");
        expect(result).toHaveProperty("error");
    });

    it("returns success on happy path", async () => {
        const result = await deleteDraftCandidate("cand-1");
        expect(result).toEqual({ success: true });
    });

    it("revalidates both mandates and candidates paths on success", async () => {
        const { revalidatePath } = await import("next/cache");
        vi.mocked(revalidatePath).mockClear();
        await deleteDraftCandidate("cand-1");
        expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/recruiter/mandates");
        expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/recruiter/candidates");
    });
});
