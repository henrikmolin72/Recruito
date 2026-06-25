import { describe, it, expect, beforeEach, vi } from "vitest";

// Pins authorizeMandate's authorization branches. The regression: an admin
// recognized via app_metadata.role (the canonical signal requireAdmin uses) must
// be authorized EVEN IF profiles.role has drifted off "admin" — previously this
// path checked profiles.role alone and wrongly returned "Recruiter profile required".

let currentUser: any = null; // { id, app_metadata }
let profilesStore: Record<string, { role: string }> = {};
let recruitersStore: Array<{ id: string; user_id: string }> = [];
let mandatesStore: Array<{ id: string; recruiter_id: string }> = [];

function makeClient() {
  function from(table: string) {
    const filters: Record<string, any> = {};
    const chain: any = {
      select: () => chain,
      eq: (c: string, v: any) => { filters[c] = v; return chain; },
      single: async () => {
        if (table === "profiles") {
          const p = profilesStore[filters.id];
          return { data: p ?? null, error: p ? null : { code: "PGRST116" } };
        }
        if (table === "recruiters") {
          const r = recruitersStore.find((x) => x.user_id === filters.user_id);
          return { data: r ?? null, error: null };
        }
        if (table === "job_mandates") {
          let rows = mandatesStore.filter((m) => m.id === filters.id);
          if (filters.recruiter_id !== undefined) rows = rows.filter((m) => m.recruiter_id === filters.recruiter_id);
          return { data: rows[0] ?? null, error: null };
        }
        return { data: null, error: null };
      },
    };
    return chain;
  }
  return {
    from,
    auth: { getUser: async () => ({ data: { user: currentUser } }) },
  };
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => makeClient() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => makeClient() }));

import { authorizeMandate } from "./eval-data";

beforeEach(() => {
  currentUser = null;
  profilesStore = {};
  recruitersStore = [];
  mandatesStore = [{ id: "m1", recruiter_id: "r1" }];
});

describe("authorizeMandate", () => {
  it("authorizes an admin via app_metadata.role even when profiles.role has drifted (regression)", async () => {
    currentUser = { id: "u1", app_metadata: { role: "admin" } };
    profilesStore["u1"] = { role: "company" }; // drifted off "admin"
    const res = await authorizeMandate("m1");
    expect("error" in res).toBe(false);
    expect((res as any).isAdmin).toBe(true);
  });

  it("authorizes an admin via profiles.role when app_metadata is absent", async () => {
    currentUser = { id: "u1", app_metadata: {} };
    profilesStore["u1"] = { role: "admin" };
    const res = await authorizeMandate("m1");
    expect("error" in res).toBe(false);
    expect((res as any).isAdmin).toBe(true);
  });

  it("authorizes a recruiter who owns the mandate", async () => {
    currentUser = { id: "u2", app_metadata: { role: "recruiter" } };
    profilesStore["u2"] = { role: "recruiter" };
    recruitersStore = [{ id: "r1", user_id: "u2" }];
    const res = await authorizeMandate("m1");
    expect("error" in res).toBe(false);
    expect((res as any).isAdmin).toBe(false);
  });

  it("rejects a recruiter who does NOT own the mandate (Mandate not found)", async () => {
    currentUser = { id: "u2", app_metadata: { role: "recruiter" } };
    profilesStore["u2"] = { role: "recruiter" };
    recruitersStore = [{ id: "r2", user_id: "u2" }]; // owns r2, mandate belongs to r1
    const res = await authorizeMandate("m1");
    expect(res).toEqual({ error: "Mandate not found" });
  });

  it("rejects a non-admin non-recruiter with 'Recruiter profile required'", async () => {
    currentUser = { id: "u3", app_metadata: { role: "company" } };
    profilesStore["u3"] = { role: "company" };
    const res = await authorizeMandate("m1");
    expect(res).toEqual({ error: "Recruiter profile required" });
  });

  it("rejects when not authenticated", async () => {
    currentUser = null;
    const res = await authorizeMandate("m1");
    expect(res).toEqual({ error: "Not authenticated" });
  });
});
