import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/screening/eval-data", () => ({ authorizeMandate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { getLatestEvaluation, getCompanyCandidateScreening } from "./screening";
import { authorizeMandate } from "@/lib/screening/eval-data";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const authMock = authorizeMandate as unknown as ReturnType<typeof vi.fn>;

const REPORT = { report_markdown: "R", model_version: "claude-x", created_at: "2026-06-28T00:00:00Z" };

// Minimal table-aware fake of the admin client used by getLatestEvaluation.
function fakeAdmin(opts: { recruiterId?: string | null; candRecruiterId?: string | null; report?: any }) {
  return {
    from(table: string): any {
      if (table === "recruiters") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: opts.recruiterId != null ? { id: opts.recruiterId } : null }) }) }) };
      }
      if (table === "candidates") {
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: opts.candRecruiterId !== undefined ? { recruiter_id: opts.candRecruiterId } : null }) }) }) };
      }
      // candidate_screenings: chainable, resolves at maybeSingle()
      const chain: any = {
        select: () => chain, eq: () => chain, order: () => chain, limit: () => chain,
        maybeSingle: () => Promise.resolve({ data: opts.report ?? null }),
      };
      return chain;
    },
  };
}

describe("getLatestEvaluation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when authorization fails", async () => {
    authMock.mockResolvedValue({ error: "Not authenticated" });
    expect(await getLatestEvaluation("c-1", "m-1")).toBeNull();
  });

  it("admin reads the report without an ownership check", async () => {
    authMock.mockResolvedValue({ admin: fakeAdmin({ report: REPORT }), userId: "u-1", isAdmin: true });
    expect(await getLatestEvaluation("c-1", "m-1")).toEqual({
      reportMarkdown: "R", modelVersion: "claude-x", createdAt: "2026-06-28T00:00:00Z",
      injectionFlagged: false,
    });
  });

  it("surfaces injectionFlagged=true to admin when the stored row is flagged", async () => {
    authMock.mockResolvedValue({
      admin: fakeAdmin({ report: { ...REPORT, injection_flagged: true } }), userId: "u-1", isAdmin: true,
    });
    expect(await getLatestEvaluation("c-1", "m-1")).toMatchObject({ injectionFlagged: true });
  });

  it("recruiter who OWNS the candidate gets the report", async () => {
    authMock.mockResolvedValue({
      admin: fakeAdmin({ recruiterId: "rec-1", candRecruiterId: "rec-1", report: REPORT }),
      userId: "u-1", isAdmin: false,
    });
    expect(await getLatestEvaluation("c-1", "m-1")).toMatchObject({ reportMarkdown: "R" });
  });

  it("IDOR: recruiter who does NOT own the candidate gets null (never the report)", async () => {
    authMock.mockResolvedValue({
      admin: fakeAdmin({ recruiterId: "rec-1", candRecruiterId: "rec-2", report: REPORT }),
      userId: "u-1", isAdmin: false,
    });
    expect(await getLatestEvaluation("victim-candidate", "m-1")).toBeNull();
  });
});

// Company view: an owning, screened, client-visible-tier candidate — the fixture
// only varies which report markdown is stored on the newest screenings row.
function stubCompanyStack(screeningRow: any) {
  (createClient as any).mockResolvedValue({
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "owner-1" } } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({
            data: {
              job_id: "j-1",
              recruito_screened_at: "2026-07-01T00:00:00Z",
              ai_match_score: 90,
              job: { company: { user_id: "owner-1" } },
            },
          }),
        }),
      }),
    }),
  });
  const chain: any = {
    select: () => chain, eq: () => chain, order: () => chain, limit: () => chain,
    maybeSingle: () => Promise.resolve({ data: screeningRow, error: null }),
  };
  (createAdminClient as any).mockReturnValue({ from: () => chain });
}

describe("getCompanyCandidateScreening — client-facing report (client request 2026-07-11)", () => {
  beforeEach(() => vi.clearAllMocks());

  const base = { model_version: "claude-x", created_at: "2026-07-11T00:00:00Z" };

  it("serves the dedicated client report untouched when present", async () => {
    stubCompanyStack({
      ...base,
      report_markdown: "| Direct Match Score | 85% |",
      client_report_markdown: "## Candidate Overview\nStrong profile for the role.",
    });
    const res = await getCompanyCandidateScreening("c-1");
    expect(res?.reportMarkdown).toBe("## Candidate Overview\nStrong profile for the role.");
  });

  it("legacy row (no client report) falls back to the masked internal report", async () => {
    stubCompanyStack({ ...base, report_markdown: "Direct Match Score: 85%", client_report_markdown: null });
    const res = await getCompanyCandidateScreening("c-1");
    expect(res?.reportMarkdown).not.toContain("85%");
  });

  it("safety net: a percentage slipping into the client report is still stripped", async () => {
    stubCompanyStack({ ...base, report_markdown: "internal", client_report_markdown: "Matches around 90% of needs." });
    const res = await getCompanyCandidateScreening("c-1");
    expect(res?.reportMarkdown).not.toContain("90%");
  });
});
