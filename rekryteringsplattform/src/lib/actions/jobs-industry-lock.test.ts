import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Industry lock (client request 2026-08-27): a job's industry is fixed to the
// company's signup industry. A disabled <select> is cosmetic — the server must
// ignore whatever industry value is POSTed whenever the company profile carries
// a canonical industry. Companies without one (pre-dropdown accounts, legacy
// free text) keep the posted value — the editable-select fallback.
// ---------------------------------------------------------------------------

let insertedPayload: Record<string, unknown> | null = null;
let companyIndustry: string | null = "Healthcare";

function makeSupabase() {
    return {
        auth: {
            getUser: () =>
                Promise.resolve({ data: { user: { id: "U1", app_metadata: { role: "company" }, user_metadata: {} } } }),
        },
        from(table: string) {
            if (table === "companies") {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () =>
                                Promise.resolve({
                                    data: { id: "CO1", company_name: "Acme", industry: companyIndustry },
                                    error: null,
                                }),
                        }),
                    }),
                };
            }
            if (table === "jobs") {
                return {
                    insert: (p: Record<string, unknown>) => {
                        insertedPayload = p;
                        return { select: () => ({ single: () => Promise.resolve({ data: { id: "J1" }, error: null }) }) };
                    },
                };
            }
            // placements tier-count query: awaitable filter chain → count 0
            const chain: any = {
                select: () => chain,
                eq: () => chain,
                gte: () => chain,
                not: () => chain,
                then: (res: (x: unknown) => unknown, rej?: (e: unknown) => unknown) =>
                    Promise.resolve({ count: 0, error: null }).then(res, rej),
            };
            return chain;
        },
    };
}

vi.mock("@/lib/supabase/server", () => ({ createClient: () => makeSupabase() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/validation/forms", () => ({
    validateJobForm: vi.fn(async () => ({ success: false, error: "n/a" })),
    validatePipelineStages: vi.fn(() => ({ success: false })),
}));
vi.mock("@/lib/notifications/create", () => ({ createNotification: vi.fn() }));
vi.mock("@/lib/notifications/notify-admins", () => ({ notifyAdmins: vi.fn() }));
vi.mock("@/lib/email/internal-notifications", () => ({ sendUserEmail: vi.fn() }));
vi.mock("@/lib/email/email-templates", () => ({ newJobNotificationEmail: vi.fn() }));
vi.mock("@/lib/actions/require-admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/job-fill", () => ({
    rejectRemainingCandidates: vi.fn(),
    notifyRecruitersOfJobLifecycleChange: vi.fn(),
}));

const { createJob } = await import("./jobs");

function jobForm(industry: string): FormData {
    const fd = new FormData();
    fd.set("status", "draft"); // draft path returns right after the insert
    fd.set("title", "Test role");
    fd.set("industry", industry);
    fd.set("salary_currency", "EUR");
    fd.set("salary_max", "50000");
    return fd;
}

beforeEach(() => {
    insertedPayload = null;
    companyIndustry = "Healthcare, Wellness & Fitness";
});

describe("createJob industry lock", () => {
    it("ignores a tampered posted industry when the company profile has a canonical one", async () => {
        const res = await createJob(jobForm("Legal Services"));
        expect(res).toMatchObject({ success: true });
        expect(insertedPayload?.industry).toBe("Healthcare, Wellness & Fitness");
    });

    it("keeps the posted industry when the profile has none (editable fallback)", async () => {
        companyIndustry = null;
        const res = await createJob(jobForm("Legal Services"));
        expect(res).toMatchObject({ success: true });
        expect(insertedPayload?.industry).toBe("Legal Services");
    });

    it("keeps the posted industry when the profile industry is legacy free text", async () => {
        companyIndustry = "our own weird label";
        const res = await createJob(jobForm("Legal Services"));
        expect(res).toMatchObject({ success: true });
        expect(insertedPayload?.industry).toBe("Legal Services");
    });
});
