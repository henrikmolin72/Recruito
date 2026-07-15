import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/email/internal-notifications", () => ({ sendUserEmail: vi.fn() }));
vi.mock("@/lib/actions/messages", () => ({ sendRecruiterSupportMessage: vi.fn() }));
vi.mock("@/lib/notifications/create", () => ({ createNotification: vi.fn() }));

import { sendSupportRequest } from "./support";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendUserEmail } from "@/lib/email/internal-notifications";
import { sendRecruiterSupportMessage } from "@/lib/actions/messages";
import { createNotification } from "@/lib/notifications/create";

const sendUserEmailMock = sendUserEmail as unknown as ReturnType<typeof vi.fn>;
const sendThreadMock = sendRecruiterSupportMessage as unknown as ReturnType<typeof vi.fn>;
const createNotificationMock = createNotification as unknown as ReturnType<typeof vi.fn>;

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

// Admin client used only for the .from("profiles").select("id").eq("role","admin") fan-out.
function fakeAdminClient(admins: Array<{ id: string }>) {
  return {
    from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: admins }) }) }),
  };
}

describe("sendSupportRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPPORT_EMAIL = "support@recruitomatch.com";
    sendUserEmailMock.mockResolvedValue({ sent: true });
    sendThreadMock.mockResolvedValue({ success: true });
    (createAdminClient as any).mockReturnValue(fakeAdminClient([{ id: "admin-1" }]));
  });

  it("rejects unauthenticated calls without sending anything", async () => {
    (createClient as any).mockResolvedValue(fakeSupabase({ userId: null }));

    const res = await sendSupportRequest("job-1", "This is a valid support message.");

    expect(res).toHaveProperty("error");
    expect(sendUserEmailMock).not.toHaveBeenCalled();
    expect(sendThreadMock).not.toHaveBeenCalled();
  });

  it("rejects too-short messages", async () => {
    (createClient as any).mockResolvedValue(
      fakeSupabase({ userId: "u-1", profile: { full_name: "Jane Doe", email: "jane@example.com" }, job: { id: "job-1", title: "Backend Engineer" } })
    );

    const res = await sendSupportRequest("job-1", "hi");

    expect(res).toHaveProperty("error");
    expect(sendUserEmailMock).not.toHaveBeenCalled();
    expect(sendThreadMock).not.toHaveBeenCalled();
  });

  it("sends the email with sender name, job title, and job id on a valid call", async () => {
    (createClient as any).mockResolvedValue(
      fakeSupabase({ userId: "u-1", profile: { full_name: "Jane Doe", email: "jane@example.com" }, job: { id: "job-1", title: "Backend Engineer" } })
    );

    const res = await sendSupportRequest("job-1", "I have a question about the guarantee period.");

    expect(res).toEqual({ success: true });
    expect(sendUserEmailMock).toHaveBeenCalledTimes(1);
    const call = sendUserEmailMock.mock.calls[0][0];
    expect(call.to).toBe("support@recruitomatch.com");
    expect(call.text).toContain("Jane Doe");
    expect(call.text).toContain("Backend Engineer");
    expect(call.text).toContain("job-1");
    expect(call.text).toContain("I have a question about the guarantee period.");
  });

  // Reproduces the prod "Could not send your message" bug: no email provider
  // configured (dispatch skips) — the in-app thread must still deliver.
  it("succeeds via the in-app support thread when the email provider is not configured", async () => {
    (createClient as any).mockResolvedValue(
      fakeSupabase({ userId: "u-1", profile: { full_name: "Lars Bergstrom", email: "lars@example.com" }, job: { id: "job-1", title: "Front-End Developer" } })
    );
    sendUserEmailMock.mockResolvedValue({ skipped: true });

    const res = await sendSupportRequest("job-1", "More info needed about this role.");

    expect(res).toEqual({ success: true });
    expect(sendThreadMock).toHaveBeenCalledTimes(1);
    const threadText = sendThreadMock.mock.calls[0][2];
    expect(threadText).toContain("Front-End Developer");
    expect(threadText).toContain("More info needed about this role.");
  });

  it("falls back to admin notifications for non-recruiter senders", async () => {
    (createClient as any).mockResolvedValue(
      fakeSupabase({ userId: "u-2", profile: { full_name: "Sajid Bhatti", email: "sajid@example.com" }, job: { id: "job-2", title: "Junior Data Analyst" } })
    );
    sendThreadMock.mockResolvedValue({ error: "Not authenticated" });
    sendUserEmailMock.mockResolvedValue({ skipped: true });

    const res = await sendSupportRequest("job-2", "Please review our job posting setup.");

    expect(res).toEqual({ success: true });
    expect(createNotificationMock).toHaveBeenCalledTimes(1);
    const [adminId, content] = createNotificationMock.mock.calls[0];
    expect(adminId).toBe("admin-1");
    expect(content.body).toContain("Please review our job posting setup.");
    expect(content.link).toBe("/admin/jobs/job-2");
  });

  it("errors only when every delivery channel fails", async () => {
    (createClient as any).mockResolvedValue(
      fakeSupabase({ userId: "u-3", profile: { full_name: "Jane Doe", email: "jane@example.com" }, job: { id: "job-3", title: "Backend Engineer" } })
    );
    sendThreadMock.mockResolvedValue({ error: "Not authenticated" });
    (createAdminClient as any).mockReturnValue(fakeAdminClient([]));
    sendUserEmailMock.mockResolvedValue({ skipped: true });

    const res = await sendSupportRequest("job-3", "This message has nowhere to go at all.");

    expect(res).toHaveProperty("error");
  });
});
