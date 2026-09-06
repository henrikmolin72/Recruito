import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Reproducing tests for the client-signup bug (Sajid 2026-09-06):
// Supabase answers a signUp for an EXISTING, UNCONFIRMED email by returning
// that same user (and re-sending the confirmation). The companies insert then
// fails on companies_user_id_key, and the old "cleanup" deleted the user —
// wiping a real account (cascade: profile + company). Written red first.
// ---------------------------------------------------------------------------

const NOW = () => new Date().toISOString();
const YESTERDAY = new Date(Date.now() - 864e5).toISOString();
type MockUser = { id: string; identities: unknown[]; created_at?: string };
const state = {
    signUp: { data: { user: null as null | MockUser }, error: null as null | { message: string } },
    profileByEmail: null as null | { id: string },
    insertError: null as null | { code: string; message: string },
    rateLimited: false,
};

const signUp = vi.fn(async () => state.signUp);
const deleteUser = vi.fn(async () => ({ error: null }));
const updateUserById = vi.fn(async () => ({ error: null }));
const insert = vi.fn(async () => ({ error: state.insertError }));
const redirect = vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
});

vi.mock("@/lib/supabase/server", () => ({
    createClient: async () => ({ auth: { signUp } }),
}));
vi.mock("@/lib/supabase/admin", () => ({
    createAdminClient: () => ({
        from: (table: string) => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: async () => ({
                        data: table === "profiles" ? state.profileByEmail : null,
                        error: null,
                    }),
                }),
            }),
            insert,
        }),
        auth: { admin: { deleteUser, updateUserById } },
    }),
}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/app-url", () => ({ getAppUrl: async () => "http://app.test" }));
vi.mock("@/lib/email/internal-notifications", () => ({
    sendInternalRecruiterEmail: async () => undefined,
    sendUserEmail: async () => undefined,
}));
vi.mock("@/i18n/server", () => ({ createTranslator: async () => (key: string) => key }));
vi.mock("@/lib/security/rate-limit", () => ({
    consumeRateLimit: async () => ({ allowed: !state.rateLimited }),
}));

import { registerCompany, registerRecruiter } from "./auth";

function companyForm(email = "Existing@Example.com") {
    const fd = new FormData();
    fd.set("company_name", "Testbolag AB");
    fd.set("how_heard", "LinkedIn");
    fd.set("industry", "Biotechnology");
    fd.set("full_name", "Test Kontakt");
    fd.set("email", email);
    fd.set("password", "e2e-pass-123");
    return fd;
}

function recruiterForm(email = "rec@example.com") {
    const fd = new FormData();
    fd.set("full_name", "Rec Ruiter");
    fd.set("email", email);
    fd.set("password", "e2e-pass-123");
    fd.set("current_country", "Sweden");
    fd.set("years_experience_bracket", "4-6");
    fd.set("how_heard", "LinkedIn");
    fd.set("agreement_freelance_recruiter", "on");
    fd.set("agreement_commission_after_guarantee", "on");
    fd.set("legal_eligibility_confirmed", "yes");
    return fd;
}

beforeEach(() => {
    vi.clearAllMocks();
    state.signUp = { data: { user: { id: "U-NEW", identities: [{ id: "i1" }], created_at: NOW() } }, error: null };
    state.profileByEmail = null;
    state.insertError = null;
    state.rateLimited = false;
});

describe("registerCompany — existing email must never delete an account", () => {
    it("known email (profiles row exists) → emailAlreadyRegistered, no signUp, no delete", async () => {
        state.profileByEmail = { id: "U-OLD" };
        const res = await registerCompany(companyForm());
        expect(res).toEqual({ error: "auth.emailAlreadyRegistered" });
        expect(signUp).not.toHaveBeenCalled();
        expect(deleteUser).not.toHaveBeenCalled();
    });

    it("pre-check missed (race) but companies_user_id_key fires → emailAlreadyRegistered, NO delete", async () => {
        state.signUp = { data: { user: { id: "U-OLD", identities: [{ id: "i1" }], created_at: NOW() } }, error: null };
        state.insertError = { code: "23505", message: 'duplicate key value violates unique constraint "companies_user_id_key"' };
        const res = await registerCompany(companyForm());
        expect(res).toEqual({ error: "auth.emailAlreadyRegistered" });
        expect(deleteUser).not.toHaveBeenCalled();
    });

    it("the real incident: signUp hands back an EXISTING user (created yesterday) → nothing is inserted, re-roled or deleted", async () => {
        state.signUp = { data: { user: { id: "U-OLD", identities: [{ id: "i1" }], created_at: YESTERDAY } }, error: null };
        state.insertError = { code: "42501", message: "permission denied" }; // even a non-unique failure must not delete
        const res = await registerCompany(companyForm());
        expect(res).toEqual({ error: "auth.emailAlreadyRegistered" });
        expect(insert).not.toHaveBeenCalled();
        expect(updateUserById).not.toHaveBeenCalled();
        expect(deleteUser).not.toHaveBeenCalled();
    });

    it("confirmed existing email (Supabase's fake user with no identities) → emailAlreadyRegistered, no insert", async () => {
        state.signUp = { data: { user: { id: "U-FAKE", identities: [], created_at: NOW() } }, error: null };
        const res = await registerCompany(companyForm());
        expect(res).toEqual({ error: "auth.emailAlreadyRegistered" });
        expect(insert).not.toHaveBeenCalled();
        expect(deleteUser).not.toHaveBeenCalled();
    });

    it("looks the email up lower-cased (Supabase stores emails lower-cased)", async () => {
        // The mock ignores the filter value; this pins that a mixed-case entry
        // still reaches the pre-check path and proceeds when nothing is found.
        await expect(registerCompany(companyForm("New@Example.com"))).rejects.toThrow("REDIRECT:/register/company?submitted=1");
    });

    it("a genuinely fresh signup whose profile insert fails is cleaned up and reported", async () => {
        state.insertError = { code: "42501", message: "permission denied for table companies" };
        const res = await registerCompany(companyForm());
        expect(res).toEqual({ error: "auth.companyProfileFailed" });
        expect(deleteUser).toHaveBeenCalledWith("U-NEW");
    });

    it("happy path: pending company row, company app_metadata role, then the 'check your email' page", async () => {
        await expect(registerCompany(companyForm())).rejects.toThrow("REDIRECT:/register/company?submitted=1");
        expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "U-NEW", approval_status: "pending" }));
        expect(updateUserById).toHaveBeenCalledWith("U-NEW", { app_metadata: { role: "company" } });
        expect(deleteUser).not.toHaveBeenCalled();
    });

    it("signUp error is mapped to a dictionary key, never echoed", async () => {
        state.signUp = { data: { user: null }, error: { message: "Error sending confirmation email" } };
        expect(await registerCompany(companyForm())).toEqual({ error: "auth.confirmationEmailFailed" });
        state.signUp = { data: { user: null }, error: { message: "User already registered" } };
        expect(await registerCompany(companyForm())).toEqual({ error: "auth.emailAlreadyRegistered" });
    });

    it("is throttled like login (the existing-email check is an enumeration oracle)", async () => {
        state.rateLimited = true;
        expect(await registerCompany(companyForm())).toEqual({ error: "auth.tooManyAttempts" });
        expect(signUp).not.toHaveBeenCalled();
    });
});

describe("registerRecruiter — same guarantees", () => {
    it("known email → emailAlreadyRegistered without touching auth", async () => {
        state.profileByEmail = { id: "U-OLD" };
        expect(await registerRecruiter(recruiterForm())).toEqual({ error: "auth.emailAlreadyRegistered" });
        expect(signUp).not.toHaveBeenCalled();
        expect(deleteUser).not.toHaveBeenCalled();
    });

    it("cross-role takeover: existing company user returned to a recruiter signup → no recruiters insert, no role rewrite", async () => {
        state.signUp = { data: { user: { id: "U-OLD", identities: [{ id: "i1" }], created_at: YESTERDAY } }, error: null };
        expect(await registerRecruiter(recruiterForm())).toEqual({ error: "auth.emailAlreadyRegistered" });
        expect(insert).not.toHaveBeenCalled();
        expect(updateUserById).not.toHaveBeenCalled();
        expect(deleteUser).not.toHaveBeenCalled();
    });

    it("unique-violation on recruiters → emailAlreadyRegistered, NO delete", async () => {
        state.insertError = { code: "23505", message: "duplicate key" };
        expect(await registerRecruiter(recruiterForm())).toEqual({ error: "auth.emailAlreadyRegistered" });
        expect(deleteUser).not.toHaveBeenCalled();
    });

    it("happy path lands on the submitted page", async () => {
        await expect(registerRecruiter(recruiterForm())).rejects.toThrow("REDIRECT:/register/recruiter?submitted=1");
        expect(updateUserById).toHaveBeenCalledWith("U-NEW", { app_metadata: { role: "recruiter" } });
    });
});
