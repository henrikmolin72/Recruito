import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Pinning test for placements.ts (CLAUDE.md §6: load-bearing hot path — pin
// current behavior before any refactor). This locks the placement status
// state-machine: the invoice transition and the payment branch that decides
// guarantee_active vs payout_released. It deliberately does NOT assert on
// notification/email wording — only the persisted status transitions, which
// are the load-bearing behavior.
// ---------------------------------------------------------------------------

// Per-test mutable fixtures + a capture log of every write the action issues.
let placementRow: any;
let recruiterRow: any;
let profileRow: any;
// Per-table error injected into awaited update chains (simulates RLS/constraint failures).
let updateErrorByTable: Record<string, any> = {};
const writes: Array<{ table: string; patch: any }> = [];
const rpcCalls: Array<{ fn: string; args: any }> = [];

// Minimal chainable Supabase mock. select chains resolve via single()/maybeSingle()
// returning the fixture for that table; update/insert chains are awaited directly
// (e.g. `update(..).eq(..)`) and recorded in `writes` via the thenable.
function makeClient() {
  function from(table: string) {
    let op: "select" | "update" | "insert" = "select";
    let patch: any = null;
    const selectResult = () => {
      if (table === "placements") return { data: placementRow, error: null };
      if (table === "recruiters") return { data: recruiterRow, error: null };
      if (table === "profiles") return { data: profileRow, error: null };
      if (table === "jobs") return { data: { title: "Developer" }, error: null };
      return { data: null, error: null };
    };
    const chain: any = {
      select: () => chain,
      update: (p: any) => { op = "update"; patch = p; return chain; },
      insert: (p: any) => { op = "insert"; patch = p; return chain; },
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      single: async () => selectResult(),
      maybeSingle: async () => selectResult(),
      // Awaiting an update/insert chain records the write.
      then: (resolve: any, reject: any) => {
        if (op === "update" || op === "insert") writes.push({ table, patch });
        const error = op === "update" ? updateErrorByTable[table] ?? null : null;
        return Promise.resolve({ data: null, error }).then(resolve, reject);
      },
    };
    return chain;
  }
  return {
    from,
    rpc: async (fn: string, args: any) => {
      rpcCalls.push({ fn, args });
      return { data: null, error: null };
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => makeClient() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => makeClient() }));
vi.mock("@/lib/actions/require-admin", () => ({
  requireAdmin: async () => ({ supabase: makeClient(), user: { id: "admin-1" } }),
}));
const { logCandidateStageChange } = vi.hoisted(() => ({ logCandidateStageChange: vi.fn() }));
vi.mock("@/lib/candidate-stage-history", () => ({ logCandidateStageChange }));
vi.mock("@/lib/notifications/create", () => ({ createNotification: vi.fn() }));
vi.mock("@/lib/email/internal-notifications", () => ({ sendUserEmail: vi.fn() }));
// Spy so the payout link handed to the template can be asserted.
const { paymentCompletedEmail } = vi.hoisted(() => ({
  paymentCompletedEmail: vi.fn((_args: { payoutUrl: string }) => "<html></html>"),
}));
vi.mock("@/lib/email/email-templates", () => ({ paymentCompletedEmail }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// getAppUrl() reads request headers; `headerValues` lets a test simulate the
// proxy headers Vercel sets (or their absence, falling back to the env var).
let headerValues: Record<string, string> = {};
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (k: string) => headerValues[k.toLowerCase()] ?? null }),
}));

import { sendPlacementInvoice, recordPlacementPayment, reportGuaranteeFailure, completeGuarantee } from "./placements";

const placementWrites = () => writes.filter((w) => w.table === "placements");

beforeEach(() => {
  writes.length = 0;
  rpcCalls.length = 0;
  updateErrorByTable = {};
  logCandidateStageChange.mockReset();
  paymentCompletedEmail.mockClear();
  headerValues = {};
  recruiterRow = { user_id: "user-1" };
  // email_opt_out short-circuits the email branch (keeps the test focused).
  profileRow = { email: "r@example.com", full_name: "Rec", email_opt_out: true };
});

describe("recordPlacementPayment — payout email link", () => {
  // Opts IN to the email branch that the other tests deliberately skip.
  function arrangePaidPlacement() {
    profileRow = { email: "r@example.com", full_name: "Rec", email_opt_out: false };
    placementRow = {
      id: "p1", status: "invoice_sent", guarantee_end_date: null,
      recruiter_id: "r1", candidate_id: "c1", job_id: "j1",
      candidate: { first_name: "Cand", last_name: "Idate" },
    };
  }

  const payoutUrl = () => paymentCompletedEmail.mock.calls.at(0)?.[0]?.payoutUrl;

  it("builds the payout link from NEXT_PUBLIC_APP_URL", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://configured.example";
    arrangePaidPlacement();

    await recordPlacementPayment("p1");

    expect(payoutUrl()).toBe("https://configured.example/recruiter/earnings");
  });

  it("falls back to the request host, never a third-party domain, when NEXT_PUBLIC_APP_URL is unset", async () => {
    // Regression guard: this used to fall back to a hardcoded recruito.com —
    // a domain the company does not own — putting links to someone else's site
    // into recruiter payout emails.
    delete process.env.NEXT_PUBLIC_APP_URL;
    headerValues = { "x-forwarded-host": "www.recruitomatch.com", "x-forwarded-proto": "https" };
    arrangePaidPlacement();

    await recordPlacementPayment("p1");

    expect(payoutUrl()).toBe("https://www.recruitomatch.com/recruiter/earnings");
    expect(payoutUrl()).not.toContain("recruito.com/");
  });
});

describe("recordPlacementPayment — payment branch", () => {
  it("enters guarantee_active when the guarantee period is still open", async () => {
    const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
    placementRow = {
      id: "p1", status: "invoice_sent", guarantee_end_date: future,
      recruiter_id: "r1", candidate_id: "c1", job_id: "j1",
      candidate: { first_name: "Cand", last_name: "Idate" },
    };

    const res = await recordPlacementPayment("p1");

    expect(res).toEqual({ success: true });
    const upd = placementWrites().at(0)?.patch;
    expect(upd.status).toBe("guarantee_active");
    expect(upd.payment_received_at).toBeTruthy();
    // Must NOT release payout while the guarantee is active.
    expect(upd.payout_released_at).toBeUndefined();
    expect(upd.completed_at).toBeUndefined();
    // Candidate is moved into guarantee tracking + the move hits the timeline.
    const candWrite = writes.find((w) => w.table === "candidates");
    expect(candWrite?.patch.status).toBe("guarantee_tracking");
    expect(logCandidateStageChange).toHaveBeenCalledWith(expect.objectContaining({
      candidateId: "c1", jobId: "j1", toStage: "guarantee_tracking", action: "move", changedByRole: "admin",
    }));
    // Audit trail: the admin payment-recording action is logged.
    const audit = writes.find((w) => w.table === "audit_log");
    expect(audit?.patch).toMatchObject({
      action_type: "placement_payment_recorded",
      target_id: "p1",
    });
  });

  it("releases payout immediately when there is no open guarantee", async () => {
    placementRow = {
      id: "p1", status: "invoice_sent", guarantee_end_date: null,
      recruiter_id: "r1", candidate_id: "c1",
      candidate: { first_name: "Cand", last_name: "Idate" },
    };

    const res = await recordPlacementPayment("p1");

    expect(res).toEqual({ success: true });
    const upd = placementWrites().at(0)?.patch;
    expect(upd.status).toBe("payout_released");
    expect(upd.payout_released_at).toBeTruthy();
    expect(upd.completed_at).toBeTruthy();
    // No guarantee tracking when released outright.
    expect(writes.some((w) => w.table === "candidates")).toBe(false);
  });

  it("logs (not swallows) a failed candidate update while keeping the recorded payment", async () => {
    const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
    placementRow = {
      id: "p1", status: "invoice_sent", guarantee_end_date: future,
      recruiter_id: "r1", candidate_id: "c1",
      candidate: { first_name: "Cand", last_name: "Idate" },
    };
    updateErrorByTable["candidates"] = { message: "RLS violation" };
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await recordPlacementPayment("p1");

    // Placement update succeeded → action reports success…
    expect(res).toEqual({ success: true });
    // …but the candidate failure is surfaced in the logs, not swallowed.
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("candidate c1 not moved to guarantee_tracking"),
      expect.objectContaining({ message: "RLS violation" }),
    );
    errSpy.mockRestore();
  });

  it("rejects payment from a non-invoice_sent status without writing", async () => {
    placementRow = { id: "p1", status: "confirmed", recruiter_id: "r1", candidate_id: "c1" };

    const res = await recordPlacementPayment("p1");

    expect(res.error).toMatch(/status/i);
    expect(placementWrites()).toHaveLength(0);
  });
});

describe("sendPlacementInvoice — invoice transition", () => {
  // Client rule 2026-08-27: invoicing requires a confirmed joining date AND a
  // guarantee end date that has already been reached — both dates here are in
  // the past so the happy-path fixture clears the gate.
  const baseInvoiceable = {
    id: "p1", status: "confirmed", invoice_sent_at: null, recruiter_id: "r1",
    joining_date: "2026-01-10", guarantee_end_date: "2026-03-10",
    candidate: { first_name: "Cand", last_name: "Idate", job_id: "j1" },
    job: { title: "Developer" },
    company: { user_id: "co-1", company_name: "Acme" },
    total_fee: 1000, recruiter_fee: 300, salary_currency: "SEK",
  };

  it("transitions confirmed -> invoice_sent", async () => {
    placementRow = { ...baseInvoiceable };

    const res = await sendPlacementInvoice("p1");

    expect(res).toEqual({ success: true });
    const upd = placementWrites().at(0)?.patch;
    expect(upd.status).toBe("invoice_sent");
    expect(upd.invoice_sent_at).toBeTruthy();
    // Audit trail: the admin invoice action is logged.
    const audit = writes.find((w) => w.table === "audit_log");
    expect(audit?.patch).toMatchObject({
      action_type: "placement_invoice_sent",
      target_type: "placement",
      target_id: "p1",
      performed_by: "admin-1",
    });
  });

  it("refuses to re-invoice an already-invoiced placement", async () => {
    placementRow = { ...baseInvoiceable, invoice_sent_at: "2025-01-01T00:00:00.000Z" };

    const res = await sendPlacementInvoice("p1");

    expect(res.error).toMatch(/redan/i);
    expect(placementWrites()).toHaveLength(0);
  });

  it("refuses to invoice from an invalid status", async () => {
    placementRow = { ...baseInvoiceable, status: "invoice_sent" };

    const res = await sendPlacementInvoice("p1");

    expect(res.error).toMatch(/status/i);
    expect(placementWrites()).toHaveLength(0);
  });

  // Client rule 2026-08-27: no invoicing before the joining date and guarantee
  // end date are entered AND the guarantee end date has been reached.
  it("refuses to invoice when the joining date is missing", async () => {
    placementRow = { ...baseInvoiceable, joining_date: null };

    const res = await sendPlacementInvoice("p1");

    expect(res.error).toBeTruthy();
    expect(placementWrites()).toHaveLength(0);
  });

  it("refuses to invoice when the guarantee end date is missing", async () => {
    placementRow = { ...baseInvoiceable, guarantee_end_date: null };

    const res = await sendPlacementInvoice("p1");

    expect(res.error).toBeTruthy();
    expect(placementWrites()).toHaveLength(0);
  });

  it("refuses to invoice while the guarantee end date is still in the future", async () => {
    placementRow = { ...baseInvoiceable, guarantee_end_date: "2999-01-01" };

    const res = await sendPlacementInvoice("p1");

    expect(res.error).toBeTruthy();
    expect(placementWrites()).toHaveLength(0);
  });
});

describe("reportGuaranteeFailure — refund audit trail", () => {
  it("records a guarantee-failure audit entry on success", async () => {
    placementRow = {
      id: "p1", status: "guarantee_active", total_fee: 1000,
      recruiter_id: "r1", candidate_id: "c1", company_id: "co1", job_id: "j1",
      candidate: { first_name: "Cand", last_name: "Idate" }, job: { title: "Developer" },
    };

    const res = await reportGuaranteeFailure("p1", "left early");

    expect(res).toEqual({ success: true });
    expect(placementWrites().at(0)?.patch.status).toBe("guarantee_failed");
    // The failure lands in the candidate timeline with its reason.
    expect(logCandidateStageChange).toHaveBeenCalledWith(expect.objectContaining({
      candidateId: "c1", jobId: "j1", fromStage: "guarantee_tracking",
      toStage: "guarantee_failed", action: "move", changedByRole: "admin", reason: "left early",
    }));
    const audit = writes.find((w) => w.table === "audit_log");
    expect(audit?.patch).toMatchObject({
      action_type: "placement_guarantee_failed",
      target_id: "p1",
      reason: "left early",
    });
  });
});

describe("completeGuarantee — admin marks guarantee period completed", () => {
  const activePlacement = {
    id: "p1", status: "guarantee_active", recruiter_fee: 300, salary_currency: "SEK",
    recruiter_id: "r1", candidate_id: "c1", company_id: "co1", job_id: "j1",
    candidate: { first_name: "Cand", last_name: "Idate" }, job: { title: "Developer" },
  };

  it("transitions guarantee_active -> payout_released and completes the candidate", async () => {
    placementRow = { ...activePlacement };

    const res = await completeGuarantee("p1");

    expect(res).toEqual({ success: true });
    const upd = placementWrites().at(0)?.patch;
    expect(upd.status).toBe("payout_released");
    expect(upd.payout_released_at).toBeTruthy();
    expect(upd.completed_at).toBeTruthy();
    const candWrite = writes.find((w) => w.table === "candidates");
    expect(candWrite?.patch.status).toBe("completed");
    // Guarantee completion lands in the candidate timeline.
    expect(logCandidateStageChange).toHaveBeenCalledWith(expect.objectContaining({
      candidateId: "c1", jobId: "j1", fromStage: "guarantee_tracking",
      toStage: "completed", action: "move", changedByRole: "admin",
    }));
    const audit = writes.find((w) => w.table === "audit_log");
    expect(audit?.patch).toMatchObject({
      action_type: "placement_guarantee_completed",
      target_type: "placement",
      target_id: "p1",
      performed_by: "admin-1",
    });
    // Recruiter dashboard sync: metrics recalculated immediately.
    expect(rpcCalls).toContainEqual({
      fn: "fn_recalculate_recruiter_metrics",
      args: { p_recruiter_id: "r1" },
    });
  });

  it("rejects completion when the placement is not in guarantee_active", async () => {
    placementRow = { ...activePlacement, status: "invoice_sent" };

    const res = await completeGuarantee("p1");

    expect(res.error).toBeTruthy();
    expect(placementWrites()).toHaveLength(0);
    expect(rpcCalls).toHaveLength(0);
  });
});

describe("recordPlacementPayment — recruiter metrics sync", () => {
  it("recalculates recruiter metrics when the guarantee goes active", async () => {
    const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
    placementRow = {
      id: "p1", status: "invoice_sent", guarantee_end_date: future,
      recruiter_id: "r1", candidate_id: "c1",
      candidate: { first_name: "Cand", last_name: "Idate" },
    };

    const res = await recordPlacementPayment("p1");

    expect(res).toEqual({ success: true });
    expect(rpcCalls).toContainEqual({
      fn: "fn_recalculate_recruiter_metrics",
      args: { p_recruiter_id: "r1" },
    });
  });
});
