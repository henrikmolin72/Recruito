import { describe, it, expect, beforeEach, vi } from "vitest";

// Unit tests for the Resend webhook handler. Contracts:
//  - Signature verification is the security boundary: invalid/missing → 400.
//  - Only permanent bounces + complaints suppress; transient bounces and other
//    event types are acknowledged (200) without writing.
//  - Multiple recipients each get suppressed; the handler is safe to re-run.
//  - A DB write failure returns 500 so Svix retries.

const { verifyMock, addSuppressionMock } = vi.hoisted(() => ({
  verifyMock: vi.fn(),
  addSuppressionMock: vi.fn(),
}));

// Mock the Resend SDK: only webhooks.verify is exercised. verifyMock throws to
// simulate a bad signature, or returns a typed event payload on success.
vi.mock("resend", () => ({
  Resend: class {
    webhooks = { verify: verifyMock };
    constructor(_key?: string) {}
  },
}));

vi.mock("@/lib/email/suppression", () => ({
  addSuppression: addSuppressionMock,
}));

import { POST } from "./route";

type Headers = Record<string, string>;

const VALID_HEADERS: Headers = {
  "svix-id": "msg_123",
  "svix-timestamp": "1700000000",
  "svix-signature": "v1,abc",
};

function makeRequest(headers: Headers, body = "{}") {
  return {
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    text: () => Promise.resolve(body),
  } as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  verifyMock.mockReset();
  addSuppressionMock.mockReset();
  addSuppressionMock.mockResolvedValue(undefined);
  process.env.RESEND_WEBHOOK_SECRET = "whsec_test";
  process.env.RESEND_API_KEY = "re_test";
});

describe("POST /api/webhooks/resend", () => {
  it("returns 500 when the webhook secret is not configured", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    const res = await POST(makeRequest(VALID_HEADERS));
    expect(res.status).toBe(500);
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it("returns 400 when signature headers are missing", async () => {
    const res = await POST(makeRequest({ "svix-id": "msg_123" }));
    expect(res.status).toBe(400);
    expect(verifyMock).not.toHaveBeenCalled();
    expect(addSuppressionMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the signature is invalid", async () => {
    verifyMock.mockImplementation(() => {
      throw new Error("invalid signature");
    });
    const res = await POST(makeRequest(VALID_HEADERS));
    expect(res.status).toBe(400);
    expect(addSuppressionMock).not.toHaveBeenCalled();
  });

  it("suppresses on a permanent (hard) bounce", async () => {
    verifyMock.mockReturnValue({
      type: "email.bounced",
      data: { to: ["dead@inbox.com"], bounce: { type: "Permanent", subType: "General", message: "x" } },
    });
    const res = await POST(makeRequest(VALID_HEADERS));
    expect(res.status).toBe(200);
    expect(addSuppressionMock).toHaveBeenCalledTimes(1);
    expect(addSuppressionMock).toHaveBeenCalledWith("dead@inbox.com", "hard_bounce");
  });

  it("does NOT suppress on a transient (soft) bounce", async () => {
    verifyMock.mockReturnValue({
      type: "email.bounced",
      data: { to: ["busy@inbox.com"], bounce: { type: "Transient", subType: "MailboxFull", message: "x" } },
    });
    const res = await POST(makeRequest(VALID_HEADERS));
    expect(res.status).toBe(200);
    expect(addSuppressionMock).not.toHaveBeenCalled();
  });

  it("suppresses on a complaint", async () => {
    verifyMock.mockReturnValue({
      type: "email.complained",
      data: { to: ["angry@inbox.com"] },
    });
    const res = await POST(makeRequest(VALID_HEADERS));
    expect(res.status).toBe(200);
    expect(addSuppressionMock).toHaveBeenCalledWith("angry@inbox.com", "complaint");
  });

  it("acknowledges unrelated event types without writing", async () => {
    verifyMock.mockReturnValue({
      type: "email.delivered",
      data: { to: ["fine@inbox.com"] },
    });
    const res = await POST(makeRequest(VALID_HEADERS));
    expect(res.status).toBe(200);
    expect(addSuppressionMock).not.toHaveBeenCalled();
  });

  it("suppresses every recipient on a multi-recipient bounce", async () => {
    verifyMock.mockReturnValue({
      type: "email.bounced",
      data: { to: ["a@x.com", "b@x.com"], bounce: { type: "Permanent", subType: "G", message: "x" } },
    });
    const res = await POST(makeRequest(VALID_HEADERS));
    expect(res.status).toBe(200);
    expect(addSuppressionMock).toHaveBeenCalledTimes(2);
    expect(addSuppressionMock).toHaveBeenCalledWith("a@x.com", "hard_bounce");
    expect(addSuppressionMock).toHaveBeenCalledWith("b@x.com", "hard_bounce");
  });

  it("is safe to process the same event twice (idempotent handler)", async () => {
    verifyMock.mockReturnValue({
      type: "email.complained",
      data: { to: ["dup@inbox.com"] },
    });
    const first = await POST(makeRequest(VALID_HEADERS));
    const second = await POST(makeRequest(VALID_HEADERS));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });

  it("returns 500 when the suppression write fails (lets Svix retry)", async () => {
    verifyMock.mockReturnValue({
      type: "email.complained",
      data: { to: ["dead@inbox.com"] },
    });
    addSuppressionMock.mockRejectedValue(new Error("db down"));
    const res = await POST(makeRequest(VALID_HEADERS));
    expect(res.status).toBe(500);
  });
});
