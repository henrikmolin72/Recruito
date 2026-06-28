import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/screening/eval-data", () => ({ authorizeMandate: vi.fn() }));

import { getLatestEvaluation } from "./screening";
import { authorizeMandate } from "@/lib/screening/eval-data";

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
    });
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
