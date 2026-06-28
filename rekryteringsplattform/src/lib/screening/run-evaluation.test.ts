import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/screening/eval-data", () => ({ gatherEvalData: vi.fn() }));
vi.mock("@/lib/screening/evaluation-prompt", () => ({ fillEvaluationPrompt: vi.fn(() => "PROMPT") }));
vi.mock("@/lib/screening/extract-match-score", () => ({ extractMatchScore: vi.fn(() => 77) }));

const anthropicCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: anthropicCreate };
  },
}));

import { runCandidateEvaluation } from "./run-evaluation";
import { gatherEvalData } from "./eval-data";

const gather = gatherEvalData as unknown as ReturnType<typeof vi.fn>;

function makeAdmin() {
  const candidatesUpdate = vi.fn(() => {
    const chain: any = { eq: vi.fn(() => chain), is: vi.fn(() => Promise.resolve({ error: null })) };
    return chain;
  });
  const screeningsInsert = vi.fn(() => Promise.resolve({ error: null }));
  const admin: any = {
    storage: {
      from: vi.fn(() => ({
        download: vi.fn(() => Promise.resolve({ data: { arrayBuffer: async () => new ArrayBuffer(8) }, error: null })),
      })),
    },
    from: vi.fn((table: string) => {
      if (table === "candidate_screenings") return { insert: screeningsInsert };
      if (table === "candidates") return { update: candidatesUpdate };
      return {};
    }),
    candidatesUpdate,
    screeningsInsert,
  };
  return admin;
}

const evalData = (cvPath: string | null) => ({
  jobId: "job-1",
  jdText: "Some JD",
  config: { targetSector: null, adjacentSectors: null, transferableSkills: null, customKeywords: null },
  cvPath,
  screeningAnswers: [],
});

const baseArgs = (admin: any, setScore: boolean) => ({
  admin,
  mandateId: "m-1",
  candidateId: "c-1",
  actorUserId: "u-1",
  setScore,
});

describe("runCandidateEvaluation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
    anthropicCreate.mockResolvedValue({ content: [{ type: "text", text: "REPORT with score" }] });
  });

  it("returns no_cv (422) and never calls the model when the candidate has no CV", async () => {
    gather.mockResolvedValue(evalData(null));
    const admin = makeAdmin();
    const res = await runCandidateEvaluation(baseArgs(admin, true));
    expect(res).toEqual({ ok: false, error: "no_cv", status: 422 });
    expect(anthropicCreate).not.toHaveBeenCalled();
  });

  it("returns unsupported_cv_format (422) for a DOCX CV (PDF/TXT only)", async () => {
    gather.mockResolvedValue(evalData("cvs/jane.docx"));
    const res = await runCandidateEvaluation(baseArgs(makeAdmin(), true));
    expect(res).toEqual({ ok: false, error: "unsupported_cv_format", status: 422 });
    expect(anthropicCreate).not.toHaveBeenCalled();
  });

  it("propagates gatherEvalData errors as 404", async () => {
    gather.mockResolvedValue({ error: "Candidate not found" });
    const res = await runCandidateEvaluation(baseArgs(makeAdmin(), true));
    expect(res).toEqual({ ok: false, error: "Candidate not found", status: 404 });
  });

  it("a Recruito (admin) run sets the company-visible ai_match_score", async () => {
    gather.mockResolvedValue(evalData("cvs/jane.pdf"));
    const admin = makeAdmin();
    const res = await runCandidateEvaluation(baseArgs(admin, true));
    expect(res.ok).toBe(true);
    expect((res as any).matchScore).toBe(77);
    expect(admin.candidatesUpdate).toHaveBeenCalledWith({ ai_match_score: 77 });
    expect(admin.screeningsInsert).toHaveBeenCalledTimes(1); // report always stored
  });

  it("a recruiter self-check stores the report but NEVER sets ai_match_score", async () => {
    gather.mockResolvedValue(evalData("cvs/jane.pdf"));
    const admin = makeAdmin();
    const res = await runCandidateEvaluation(baseArgs(admin, false));
    expect(res.ok).toBe(true);
    expect(admin.screeningsInsert).toHaveBeenCalledTimes(1);
    expect(admin.candidatesUpdate).not.toHaveBeenCalled();
  });

  it("does NOT set ai_match_score when the report insert fails (no score without a persisted report)", async () => {
    gather.mockResolvedValue(evalData("cvs/jane.pdf"));
    const admin = makeAdmin();
    admin.screeningsInsert.mockResolvedValueOnce({ error: { message: "insert failed" } });
    const res = await runCandidateEvaluation(baseArgs(admin, true));
    // The live report is still returned (callers render it from this response)…
    expect(res.ok).toBe(true);
    // …but the company-visible score must NOT be written without its backing report.
    expect(admin.candidatesUpdate).not.toHaveBeenCalled();
  });

  it("returns a 500 when the API key is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    gather.mockResolvedValue(evalData("cvs/jane.pdf"));
    const res = await runCandidateEvaluation(baseArgs(makeAdmin(), true));
    expect(res).toEqual({ ok: false, error: "AI service not configured", status: 500 });
  });
});
