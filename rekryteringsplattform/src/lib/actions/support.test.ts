import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/email/internal-notifications", () => ({ sendUserEmail: vi.fn() }));

import { sendSupportRequest } from "./support";
import { createClient } from "@/lib/supabase/server";
import { sendUserEmail } from "@/lib/email/internal-notifications";

const sendUserEmailMock = sendUserEmail as unknown as ReturnType<typeof vi.fn>;

// Minimal table-aware fake matching the .from("profiles"/"jobs").select().eq().single() chain.
function fakeSupabase(opts: { userId?: string | null; profile?: any; job?: any }) {
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: opts.userId ? { id: opts.userId } : null } }),
    },
    from(table: string): any {
      if (table === "profiles") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: opts.profile ?? null }) }) }) };
      }
      if (table === "jobs") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: opts.job ?? null }) }) }) };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

describe("sendSupportRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPPORT_EMAIL = "support@recruito.eu";
    sendUserEmailMock.mockResolvedValue({ sent: true });
  });

  it("rejects unauthenticated calls without sending an email", async () => {
    (createClient as any).mockResolvedValue(fakeSupabase({ userId: null }));

    const res = await sendSupportRequest("job-1", "This is a valid support message.");

    expect(res).toHaveProperty("error");
    expect(sendUserEmailMock).not.toHaveBeenCalled();
  });

  it("rejects too-short messages", async () => {
    (createClient as any).mockResolvedValue(
      fakeSupabase({ userId: "u-1", profile: { full_name: "Jane Doe", email: "jane@example.com" }, job: { id: "job-1", title: "Backend Engineer" } })
    );

    const res = await sendSupportRequest("job-1", "hi");

    expect(res).toHaveProperty("error");
    expect(sendUserEmailMock).not.toHaveBeenCalled();
  });

  it("sends the email with sender name, job title, and job id on a valid call", async () => {
    (createClient as any).mockResolvedValue(
      fakeSupabase({ userId: "u-1", profile: { full_name: "Jane Doe", email: "jane@example.com" }, job: { id: "job-1", title: "Backend Engineer" } })
    );

    const res = await sendSupportRequest("job-1", "I have a question about the guarantee period.");

    expect(res).toEqual({ success: true });
    expect(sendUserEmailMock).toHaveBeenCalledTimes(1);
    const call = sendUserEmailMock.mock.calls[0][0];
    expect(call.to).toBe("support@recruito.eu");
    expect(call.text).toContain("Jane Doe");
    expect(call.text).toContain("Backend Engineer");
    expect(call.text).toContain("job-1");
    expect(call.text).toContain("I have a question about the guarantee period.");
  });
});
