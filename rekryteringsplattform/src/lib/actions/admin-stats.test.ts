import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// Regression test for getAdminStats money/funnel correctness (admin dashboard).
// Pins two fixes against a mocked Supabase client + mocked requireAdmin:
//   (a) Platform revenue = Σ over placements of (job.client_fee_amount −
//       job.recruiter_fee_amount), clamped at 0, NOT the stale placement
//       platform_fee. Exercises pickFirst on both object- and array-shaped
//       embeds, a null job (→ 0), and a negative spread (→ clamped to 0).
//   (b) Total Candidates excludes drafts (query must apply .neq status,draft).
// ---------------------------------------------------------------------------

// Placement fixtures mirror live data: the first two carry real negotiated job
// fees. Multi-currency: revenue must be grouped per currency (jobs.salary_currency,
// missing → EUR for legacy rows) and NEVER summed across currencies — an ISK
// placement would otherwise swamp every EUR figure on the dashboard.
const PLACEMENTS = [
  { status: "guarantee_active", jobs: { client_fee_amount: 11880, recruiter_fee_amount: 7700 } }, // no currency → EUR bucket
  { status: "guarantee_active", jobs: [{ client_fee_amount: 9750, recruiter_fee_amount: 5200, salary_currency: "SEK" }] }, // array embed → pickFirst
  { status: "completed", jobs: { client_fee_amount: 5000, recruiter_fee_amount: 6000 } }, // negative spread → clamp 0
  { status: "confirmed", jobs: null }, // missing job → 0
  { status: "guarantee_active", jobs: { client_fee_amount: 550_000, recruiter_fee_amount: 350_000, salary_currency: "ISK" } },
];

let placementsSelect = ""; // captured select string — must fetch salary_currency

function makeClient() {
  function from(table: string) {
    const filters: Record<string, { op: "eq" | "neq"; v: unknown }> = {};
    const resolve = () => {
      if (table === "placements") return { data: PLACEMENTS, error: null };
      if (table === "companies") return { count: 3, error: null };
      if (table === "jobs") return { count: 2, error: null };
      if (table === "recruiters") {
        const f = filters["approval_status"];
        if (f?.v === "pending") return { count: 0, error: null };
        if (f?.v === "approved") return { count: 8, error: null };
        return { count: 8, error: null };
      }
      if (table === "candidates") {
        const f = filters["status"];
        // The fix: drafts must be excluded. Without .neq("status","draft") this
        // returns the full 38 and the assertion below goes red.
        if (f?.op === "neq" && f.v === "draft") return { count: 37, error: null };
        return { count: 38, error: null };
      }
      return { count: 0, data: [], error: null };
    };
    const chain: any = {
      select: (sel?: string) => { if (table === "placements" && typeof sel === "string") placementsSelect = sel; return chain; },
      eq: (k: string, v: unknown) => { filters[k] = { op: "eq", v }; return chain; },
      neq: (k: string, v: unknown) => { filters[k] = { op: "neq", v }; return chain; },
      limit: () => chain,
      then: (res: (x: unknown) => unknown, rej?: (e: unknown) => unknown) =>
        Promise.resolve(resolve()).then(res, rej),
    };
    return chain;
  }
  return { from };
}

vi.mock("@/lib/actions/require-admin", () => ({
  requireAdmin: vi.fn(async () => ({ supabase: makeClient(), user: { id: "admin" } })),
}));

import { getAdminStats } from "./admin";

describe("getAdminStats", () => {
  it("revenue = Σ(client_fee − recruiter_fee) grouped PER CURRENCY, clamped at 0, no cross-currency total", async () => {
    const stats = await getAdminStats();
    expect(stats.revenueByCurrency).toEqual({ EUR: 4180, SEK: 4550, ISK: 200_000 });
    // No combined number may exist — summing SEK + ISK + EUR is meaningless.
    expect((stats as Record<string, unknown>).totalRevenue).toBeUndefined();
    // The query must actually fetch the grouping key.
    expect(placementsSelect).toContain("salary_currency");
  });

  it("Total Candidates excludes drafts", async () => {
    const stats = await getAdminStats();
    expect(stats.totalCandidates).toBe(37);
  });
});
