import { describe, it, expect, beforeEach, vi } from "vitest";

// Unit tests for the suppression helper. Contract:
//  - isSuppressed normalizes the email to lowercase, returns true on a hit, and
//    FAILS OPEN (returns false) on any lookup error.
//  - addSuppression upserts the lowercased email with onConflict on (email,reason)
//    so duplicate webhook deliveries are idempotent, and throws on write failure.

const state = vi.hoisted(() => ({
  row: null as { email: string } | null,
  selectError: null as unknown,
  selectThrows: false,
  upsertError: null as unknown,
  eqValue: null as string | null,
  upsertCalls: [] as Array<{ payload: Record<string, unknown>; opts: Record<string, unknown> }>,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, val: string) => {
          state.eqValue = val;
          return {
            limit: (_n: number) => ({
              maybeSingle: () => {
                if (state.selectThrows) throw new Error("connection reset");
                return Promise.resolve({ data: state.row, error: state.selectError });
              },
            }),
          };
        },
      }),
      upsert: (payload: Record<string, unknown>, opts: Record<string, unknown>) => {
        state.upsertCalls.push({ payload, opts });
        return Promise.resolve({ error: state.upsertError });
      },
    }),
  }),
}));

import { isSuppressed, addSuppression } from "./suppression";

beforeEach(() => {
  state.row = null;
  state.selectError = null;
  state.selectThrows = false;
  state.upsertError = null;
  state.eqValue = null;
  state.upsertCalls = [];
});

describe("isSuppressed", () => {
  it("returns true when a suppression row exists", async () => {
    state.row = { email: "dead@inbox.com" };
    expect(await isSuppressed("dead@inbox.com")).toBe(true);
  });

  it("returns false when no row exists", async () => {
    state.row = null;
    expect(await isSuppressed("ok@inbox.com")).toBe(false);
  });

  it("lowercases + trims the address before lookup", async () => {
    await isSuppressed("  User@X.COM  ");
    expect(state.eqValue).toBe("user@x.com");
  });

  it("fails open (returns false) on a query error", async () => {
    state.selectError = { message: "db error" };
    expect(await isSuppressed("dead@inbox.com")).toBe(false);
  });

  it("fails open (returns false) when the client throws", async () => {
    state.selectThrows = true;
    expect(await isSuppressed("dead@inbox.com")).toBe(false);
  });
});

describe("addSuppression", () => {
  it("upserts the lowercased email with onConflict on (email,reason)", async () => {
    await addSuppression("Dead@Inbox.com", "hard_bounce");
    expect(state.upsertCalls).toHaveLength(1);
    expect(state.upsertCalls[0].payload).toMatchObject({
      email: "dead@inbox.com",
      reason: "hard_bounce",
    });
    expect(state.upsertCalls[0].payload.last_event_at).toEqual(expect.any(String));
    expect(state.upsertCalls[0].opts).toMatchObject({ onConflict: "email,reason" });
  });

  it("records complaints with the complaint reason", async () => {
    await addSuppression("spam@flag.com", "complaint");
    expect(state.upsertCalls[0].payload).toMatchObject({ email: "spam@flag.com", reason: "complaint" });
  });

  it("throws on write failure so the webhook can return 500", async () => {
    state.upsertError = { message: "insert failed" };
    await expect(addSuppression("dead@inbox.com", "hard_bounce")).rejects.toBeTruthy();
  });
});
