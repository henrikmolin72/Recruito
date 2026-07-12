import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// requestJobChanges: admin "Request changes" on a pending_approval job. Sends
// the job back to draft with the admin's note and notifies the company. Pins:
//   1. Wrong status (active) → { error }, NO update, no notification.
//   2. pending_approval + valid note → update sets status:"draft" + the note;
//      company user is notified once with title/body keys.
//   3. Blank / too-short note → { error }, no update.
// Mirrors admin-stats.test.ts: mock require-admin's supabase, next/cache, and
// the notification creator (spy).
// ---------------------------------------------------------------------------

const JOB = { id: "job-1", title: "Backend Engineer", status: "pending_approval", company: { user_id: "company-user-1" } };

// Records the last update payload so the test can assert on it.
let lastUpdate: Record<string, unknown> | null = null;

// Builds a supabase fake whose jobs select returns `jobRow` and whose update
// resolves to a single-row result (mimicking .select("id") after .update()).
function makeClient(jobRow: any) {
  function from(_table: string) {
    const chain: any = {
      _mode: "select" as "select" | "update",
      select() { return chain; },
      update(payload: Record<string, unknown>) { lastUpdate = payload; chain._mode = "update"; return chain; },
      eq() { return chain; },
      single: () => Promise.resolve({ data: jobRow, error: null }),
      // .update(...).eq().eq().select("id") is awaited directly (no .single()).
      then: (res: (x: unknown) => unknown, rej?: (e: unknown) => unknown) =>
        Promise.resolve({ data: [{ id: "job-1" }], error: null }).then(res, rej),
    };
    return chain;
  }
  return { from };
}

const { createNotification } = vi.hoisted(() => ({ createNotification: vi.fn(async () => {}) }));

vi.mock("@/lib/actions/require-admin", () => ({
  requireAdmin: vi.fn(async () => ({ supabase: (globalThis as any).__client, user: { id: "admin" } })),
}));
vi.mock("@/lib/notifications/create", () => ({ createNotification }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { requestJobChanges } from "./admin";

function setJob(jobRow: any) {
  (globalThis as any).__client = makeClient(jobRow);
}

describe("requestJobChanges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastUpdate = null;
  });

  it("rejects a job that is not pending_approval — no update, no notification", async () => {
    setJob({ ...JOB, status: "active" });
    const res = await requestJobChanges("job-1", "Please add a salary range.");
    expect(res.error).toBeTruthy();
    expect(lastUpdate).toBeNull();
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("pending_approval + valid note → sends to draft with the note and notifies the company", async () => {
    setJob({ ...JOB });
    const res = await requestJobChanges("job-1", "  Please add a salary range and clarify the seniority.  ");
    expect(res).toEqual({ success: true });
    expect(lastUpdate).toMatchObject({
      status: "draft",
      changes_requested_note: "Please add a salary range and clarify the seniority.",
    });
    expect(lastUpdate?.changes_requested_at).toBeTruthy();
    expect(lastUpdate?.resubmitted_at).toBeNull();
    expect(createNotification).toHaveBeenCalledTimes(1);
    const [userId, content] = createNotification.mock.calls[0] as unknown as [string, any];
    expect(userId).toBe("company-user-1");
    expect(content.titleKey).toBeTruthy();
    expect(content.bodyKey).toBeTruthy();
    expect(content.params).toMatchObject({ jobTitle: "Backend Engineer" });
  });

  it("rejects a blank / too-short note — no update", async () => {
    setJob({ ...JOB });
    const res = await requestJobChanges("job-1", "hi");
    expect(res.error).toBeTruthy();
    expect(lastUpdate).toBeNull();
    expect(createNotification).not.toHaveBeenCalled();
  });
});
