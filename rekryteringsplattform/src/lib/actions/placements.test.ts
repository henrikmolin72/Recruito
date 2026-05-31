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
const writes: Array<{ table: string; patch: any }> = [];

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
        return Promise.resolve({ data: null, error: null }).then(resolve, reject);
      },
    };
    return chain;
  }
  return { from };
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => makeClient() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => makeClient() }));
vi.mock("@/lib/actions/require-admin", () => ({
  requireAdmin: async () => ({ supabase: makeClient(), user: { id: "admin-1" } }),
}));
vi.mock("@/lib/notifications/create", () => ({ createNotification: vi.fn() }));
vi.mock("@/lib/email/internal-notifications", () => ({ sendUserEmail: vi.fn() }));
vi.mock("@/lib/email/email-templates", () => ({ paymentCompletedEmail: () => "<html></html>" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { sendPlacementInvoice, recordPlacementPayment } from "./placements";

const placementWrites = () => writes.filter((w) => w.table === "placements");

beforeEach(() => {
  writes.length = 0;
  recruiterRow = { user_id: "user-1" };
  // email_opt_out short-circuits the email branch (keeps the test focused).
  profileRow = { email: "r@example.com", full_name: "Rec", email_opt_out: true };
});

describe("recordPlacementPayment — payment branch", () => {
  it("enters guarantee_active when the guarantee period is still open", async () => {
    const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
    placementRow = {
      id: "p1", status: "invoice_sent", guarantee_end_date: future,
      recruiter_id: "r1", candidate_id: "c1",
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
    // Candidate is moved into guarantee tracking.
    const candWrite = writes.find((w) => w.table === "candidates");
    expect(candWrite?.patch.status).toBe("guarantee_tracking");
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

  it("rejects payment from a non-invoice_sent status without writing", async () => {
    placementRow = { id: "p1", status: "confirmed", recruiter_id: "r1", candidate_id: "c1" };

    const res = await recordPlacementPayment("p1");

    expect(res.error).toMatch(/status/i);
    expect(placementWrites()).toHaveLength(0);
  });
});

describe("sendPlacementInvoice — invoice transition", () => {
  const baseInvoiceable = {
    id: "p1", status: "confirmed", invoice_sent_at: null, recruiter_id: "r1",
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
});
