import { describe, it, expect, beforeEach, vi } from "vitest";

// Unit tests for the dispatch chokepoint's suppression + opt-out enforcement.
// Contract:
//  - A suppressed recipient is skipped before any provider call.
//  - An opted-out recipient (profiles.email_opt_out) is skipped, unless the
//    send is flagged transactional (account-lifecycle / internal mail).
//  - Both lookups fail OPEN: on error the mail still goes out.

const { isSuppressedMock, resendSendMock, sendMailMock, optOutState } = vi.hoisted(() => ({
  isSuppressedMock: vi.fn(),
  resendSendMock: vi.fn(),
  sendMailMock: vi.fn(),
  optOutState: {
    row: null as { id: string } | null,
    error: null as unknown,
    throws: false,
  },
}));

vi.mock("./suppression", () => ({
  isSuppressed: isSuppressedMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: unknown) => ({
          eq: (_col2: string, _val2: unknown) => ({
            limit: (_n: number) => ({
              maybeSingle: () => {
                if (optOutState.throws) throw new Error("connection reset");
                return Promise.resolve({ data: optOutState.row, error: optOutState.error });
              },
            }),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSendMock };
    constructor(_key?: string) {}
  },
}));

vi.mock("nodemailer", () => ({
  createTransport: () => ({ sendMail: sendMailMock }),
}));

import { sendUserEmail, sendInternalRecruiterEmail } from "./internal-notifications";

beforeEach(() => {
  isSuppressedMock.mockReset();
  resendSendMock.mockReset();
  sendMailMock.mockReset();
  resendSendMock.mockResolvedValue({ error: null });
  process.env.RESEND_API_KEY = "re_test";
  optOutState.row = null;
  optOutState.error = null;
  optOutState.throws = false;
});

describe("dispatch() suppression enforcement", () => {
  it("skips a suppressed recipient without calling any provider", async () => {
    isSuppressedMock.mockResolvedValue(true);
    const result = await sendUserEmail({
      to: "dead@inbox.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    });
    expect(result).toEqual({ skipped: true });
    expect(resendSendMock).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("sends to a non-suppressed recipient via Resend", async () => {
    isSuppressedMock.mockResolvedValue(false);
    const result = await sendUserEmail({
      to: "ok@inbox.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    });
    expect(result).toEqual({ sent: true });
    expect(resendSendMock).toHaveBeenCalledTimes(1);
    expect(resendSendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ok@inbox.com", subject: "Hi" }),
    );
  });

  it("sends when the suppression check resolves false (fail-open path)", async () => {
    // isSuppressed swallows its own errors and returns false; dispatch must send.
    isSuppressedMock.mockResolvedValue(false);
    const result = await sendUserEmail({
      to: "reset@inbox.com",
      subject: "Password reset",
      html: "<p>reset</p>",
    });
    expect(result).toEqual({ sent: true });
    expect(resendSendMock).toHaveBeenCalledTimes(1);
  });
});

describe("dispatch() email_opt_out enforcement", () => {
  beforeEach(() => {
    isSuppressedMock.mockResolvedValue(false);
  });

  it("skips an opted-out recipient without calling any provider", async () => {
    optOutState.row = { id: "user-1" };
    const result = await sendUserEmail({
      to: "optedout@inbox.com",
      subject: "New job",
      html: "<p>job</p>",
    });
    expect(result).toEqual({ skipped: true });
    expect(resendSendMock).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("sends to an opted-out recipient when the send is transactional", async () => {
    optOutState.row = { id: "user-1" };
    const result = await sendUserEmail({
      to: "optedout@inbox.com",
      subject: "Confirm your account",
      html: "<p>confirm</p>",
      transactional: true,
    });
    expect(result).toEqual({ sent: true });
    expect(resendSendMock).toHaveBeenCalledTimes(1);
  });

  it("fails open on a lookup error", async () => {
    optOutState.error = { message: "boom" };
    const result = await sendUserEmail({
      to: "someone@inbox.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    });
    expect(result).toEqual({ sent: true });
  });

  it("fails open when the lookup throws", async () => {
    optOutState.throws = true;
    const result = await sendUserEmail({
      to: "someone@inbox.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    });
    expect(result).toEqual({ sent: true });
  });

  it("internal review mail bypasses opt-out", async () => {
    process.env.INTERNAL_REVIEW_EMAIL = "review@recruitomatch.com";
    optOutState.row = { id: "admin-1" };
    const result = await sendInternalRecruiterEmail({
      subject: "New recruiter signup",
      text: "details",
    });
    expect(result).toEqual({ sent: true });
    delete process.env.INTERNAL_REVIEW_EMAIL;
  });
});
