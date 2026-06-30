import { describe, it, expect } from "vitest";
import { companyOwnsCandidate } from "./candidate-skills-auth";

// companyOwnsCandidate is the trust boundary for company READ access to a
// candidate's skill tags (the API route runs it on the RLS-bypassing
// service-role client). These tests pin every fail-closed branch so a future
// refactor of the nested-join shape can't silently widen access.

const COMPANY_USER = "company-user-1";
const SCREENED = "2026-06-01T00:00:00Z";

// Minimal fake of the admin client: only the chain the predicate uses
// (admin.from().select().eq().single()) needs to resolve to { data }.
function fakeAdmin(row: unknown) {
    return {
        from: () => ({
            select: () => ({
                eq: () => ({
                    single: async () => ({ data: row }),
                }),
            }),
        }),
    } as unknown as Parameters<typeof companyOwnsCandidate>[2];
}

describe("companyOwnsCandidate", () => {
    it("denies when the candidate row is missing", async () => {
        expect(await companyOwnsCandidate("c1", COMPANY_USER, fakeAdmin(null))).toBe(false);
    });

    it("denies when Recruito has not approved the candidate (recruito_screened_at null)", async () => {
        const row = { recruito_screened_at: null, job: { company: { user_id: COMPANY_USER } } };
        expect(await companyOwnsCandidate("c1", COMPANY_USER, fakeAdmin(row))).toBe(false);
    });

    it("denies when the company does not own the candidate's job", async () => {
        const row = { recruito_screened_at: SCREENED, job: { company: { user_id: "other-company" } } };
        expect(await companyOwnsCandidate("c1", COMPANY_USER, fakeAdmin(row))).toBe(false);
    });

    it("allows the owning company once the candidate is screened", async () => {
        const row = { recruito_screened_at: SCREENED, job: { company: { user_id: COMPANY_USER } } };
        expect(await companyOwnsCandidate("c1", COMPANY_USER, fakeAdmin(row))).toBe(true);
    });

    it("unwraps array-shaped nested joins (Supabase embed) and allows the owner", async () => {
        const row = { recruito_screened_at: SCREENED, job: [{ company: [{ user_id: COMPANY_USER }] }] };
        expect(await companyOwnsCandidate("c1", COMPANY_USER, fakeAdmin(row))).toBe(true);
    });
});
