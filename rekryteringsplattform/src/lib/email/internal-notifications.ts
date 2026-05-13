import { createTransport } from "nodemailer";
import { Resend } from "resend";

type SendInternalRecruiterEmailParams = {
  subject: string;
  text: string;
  html?: string;
};

const DEFAULT_INTERNAL_REVIEW_EMAIL = "henrik@aiaid.com.se";
const DEFAULT_FROM = "Recruito <no-reply@recruito.eu>";

/* ------------------------------------------------------------------ *
 * Provider selection
 * ------------------------------------------------------------------ *
 * Order of preference:
 *   1. Resend          — set RESEND_API_KEY
 *   2. Nodemailer SMTP — set SMTP_HOST / SMTP_USER / SMTP_PASS
 *   3. None            — log + skip (dev / staging without secrets)
 *
 * If Resend is configured but the send errors, we fall through to SMTP
 * (when configured) so a transient Resend outage doesn't lose the email.
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

function getInternalReviewEmail() {
  return process.env.INTERNAL_REVIEW_EMAIL || DEFAULT_INTERNAL_REVIEW_EMAIL;
}

// Subject lines must be single-line; CRLF in subject enables header injection.
function sanitizeSubject(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim();
}

async function trySmtp(args: {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<{ sent: true } | { error: true } | { skipped: true }> {
  const smtp = getSmtpConfig();
  if (!smtp) return { skipped: true };
  try {
    const transporter = createTransport(smtp);
    await transporter.sendMail({
      from: args.from,
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

async function dispatch(args: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<{ sent: true } | { skipped: true } | { error: true }> {
  const from = getFromAddress();
  const subject = sanitizeSubject(args.subject);

  // 1. Resend (primary)
  const resend = getResend();
  if (resend) {
    try {
      const { error } = await resend.emails.send({
        from,
        to: args.to,
        subject,
        html: args.html,
        text: args.text || subject,
      });
      if (!error) return { sent: true };
      console.error("Resend send error, falling back to SMTP:", error);
    } catch (err) {
      console.error("Resend exception, falling back to SMTP:", err);
    }
    // 2. SMTP fallback after Resend failure
    const smtpResult = await trySmtp({ from, to: args.to, subject, html: args.html, text: args.text });
    if ("sent" in smtpResult) return smtpResult;
    if ("error" in smtpResult) return smtpResult;
    // SMTP not configured — Resend failed and there's no fallback.
    return { error: true };
  }

  // 1b. SMTP only (no Resend configured)
  const smtpResult = await trySmtp({ from, to: args.to, subject, html: args.html, text: args.text });
  if ("sent" in smtpResult || "error" in smtpResult) return smtpResult;

  // 3. No provider configured
  console.warn("Email provider not configured (set RESEND_API_KEY or SMTP_*), skipping:", subject);
  return { skipped: true };
}

export async function sendInternalRecruiterEmail(params: SendInternalRecruiterEmailParams) {
  return dispatch({
    to: getInternalReviewEmail(),
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
}

type SendUserEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendUserEmail(params: SendUserEmailParams) {
  return dispatch({
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
}
