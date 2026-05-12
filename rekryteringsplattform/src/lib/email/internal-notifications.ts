import { createTransport } from "nodemailer";
import { Resend } from "resend";

type SendInternalRecruiterEmailParams = {
  subject: string;
  text: string;
  html?: string;
};

const INTERNAL_RECRUITER_REVIEW_EMAIL = "henrik@aiaid.com.se";
const DEFAULT_FROM = "Recruito <no-reply@recruito.eu>";

/* ------------------------------------------------------------------ *
 * Provider selection
 * ------------------------------------------------------------------ *
 * Order of preference:
 *   1. Resend         — set RESEND_API_KEY
 *   2. Nodemailer SMTP — set SMTP_HOST / SMTP_USER / SMTP_PASS
 *   3. None           — log + skip (dev / staging without secrets)
 *
 * The common helpers (`sendUserEmail`, `sendInternalRecruiterEmail`)
 * keep the same signatures so call sites don't change.
 * ------------------------------------------------------------------ */

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  };
}

function getFromAddress() {
  return process.env.EMAIL_FROM || process.env.SMTP_FROM || DEFAULT_FROM;
}

async function dispatch(args: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<{ sent: true } | { skipped: true } | { error: true }> {
  const from = getFromAddress();

  // 1. Resend
  const resend = getResend();
  if (resend) {
    try {
      const { error } = await resend.emails.send({
        from,
        to: args.to,
        subject: args.subject,
        html: args.html,
        text: args.text || args.subject,
      });
      if (error) {
        console.error("Resend send error:", error);
        return { error: true };
      }
      return { sent: true };
    } catch (err) {
      console.error("Resend exception:", err);
      return { error: true };
    }
  }

  // 2. SMTP
  const smtp = getSmtpConfig();
  if (smtp) {
    try {
      const transporter = createTransport(smtp);
      await transporter.sendMail({
        from,
        to: args.to,
        subject: args.subject,
        html: args.html,
        text: args.text || args.subject,
      });
      return { sent: true };
    } catch (err) {
      console.error("SMTP send error to:", args.to, err);
      return { error: true };
    }
  }

  // 3. No provider configured
  console.warn("Email provider not configured (set RESEND_API_KEY or SMTP_*), skipping:", args.subject);
  return { skipped: true };
}

export async function sendInternalRecruiterEmail(params: SendInternalRecruiterEmailParams) {
  return dispatch({
    to: INTERNAL_RECRUITER_REVIEW_EMAIL,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
}

type SendUserEmailParams = {
  to: string;
  subject: string;
  html: string;
};

export async function sendUserEmail(params: SendUserEmailParams) {
  return dispatch({
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
