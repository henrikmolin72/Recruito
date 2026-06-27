/**
 * POST /api/webhooks/resend
 *
 * Resend delivery webhook. On hard bounces (bounce.type === "Permanent") and
 * spam complaints we add the recipient(s) to email_suppressions so dispatch()
 * stops sending to them. All other event types are acknowledged and ignored.
 *
 * Verified via resend.webhooks.verify() (Svix under the hood) against
 * RESEND_WEBHOOK_SECRET using the RAW request body — re-parsing the body would
 * change the bytes and break the signature.
 *
 * Status contract (drives Svix retry behavior):
 *   400 — missing signature headers or invalid signature (don't retry a forgery)
 *   500 — misconfiguration, or a transient DB failure while suppressing
 *         (Svix retries for ~24h, so the suppression isn't lost)
 *   200 — event accepted, or an event type we don't act on (stop retrying)
 */
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { addSuppression, type SuppressionReason } from "@/lib/email/suppression";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("RESEND_WEBHOOK_SECRET not configured; rejecting webhook.");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: "Missing signature headers" }, { status: 400 });
  }

  // Raw body — required for signature verification.
  const payload = await request.text();

  let event;
  try {
    event = new Resend(process.env.RESEND_API_KEY).webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret,
    });
  } catch (err) {
    console.error("Resend webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "email.complained") {
      await suppressRecipients(event.data.to, "complaint");
    } else if (event.type === "email.bounced" && event.data.bounce?.type === "Permanent") {
      // Only permanent (hard) bounces suppress. Transient bounces (full mailbox,
      // temporary failures) must NOT permanently block a real recipient.
      await suppressRecipients(event.data.to, "hard_bounce");
    }
    // Every other event type (delivered, opened, clicked, transient bounce, …)
    // is acknowledged with 200 and otherwise ignored.
  } catch (err) {
    // DB write failed — return 500 so Svix retries instead of dropping it.
    console.error("Failed to record suppression from Resend webhook:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

async function suppressRecipients(recipients: string[], reason: SuppressionReason): Promise<void> {
  for (const email of recipients) {
    await addSuppression(email, reason);
  }
}
