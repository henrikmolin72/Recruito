import { describe, it, expect, beforeEach, vi } from "vitest";

// Unit tests for the dispatch chokepoint's suppression enforcement. Contract:
//  - A suppressed recipient is skipped before any provider call.
//  - A non-suppressed recipient is sent via Resend.
//  - Because isSuppressed fails open (covered in suppression.test), a falsey
//    result here means "send" — so dispatch never blocks mail on a lookup error.

const { isSuppressedMock, resendSendMock, sendMailMock } = vi.hoisted(() => ({
  isSuppressedMock: vi.fn(),
  resendSendMock: vi.fn(),
  sendMailMock: vi.fn(),
}));

vi.mock("./suppression", () => ({
  isSuppressed: isSuppressedMock,
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

import { sendUserEmail } from "./internal-notifications";

beforeEach(() => {
  isSuppressedMock.mockReset();
  resendSendMock.mockReset();
  sendMailMock.mockReset();
  resendSendMock.mockResolvedValue({ error: null });
  process.env.RESEND_API_KEY = "re_test";
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
