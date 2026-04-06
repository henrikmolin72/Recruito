import { createTransport } from "nodemailer";

type SendInternalRecruiterEmailParams = {
  subject: string;
  text: string;
  html?: string;
};

const INTERNAL_RECRUITER_REVIEW_EMAIL = "info@aiaid.com.se";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "Recruito <no-reply@aiaid.com.se>";

  if (!host || !user || !pass) {
    return null;
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    from,
  };
}

export async function sendInternalRecruiterEmail(params: SendInternalRecruiterEmailParams) {
  const config = getSmtpConfig();

  if (!config) {
    console.warn("SMTP not configured, skipping internal recruiter email:", params.subject);
    return { skipped: true as const };
  }

  const transporter = createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  await transporter.sendMail({
    from: config.from,
    to: INTERNAL_RECRUITER_REVIEW_EMAIL,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });

  return { sent: true as const };
}

type SendUserEmailParams = {
  to: string;
  subject: string;
  html: string;
};

export async function sendUserEmail(params: SendUserEmailParams) {
  const config = getSmtpConfig();

  if (!config) {
    console.warn("SMTP not configured, skipping user email to:", params.to);
    return { skipped: true as const };
  }

  try {
    const transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    await transporter.sendMail({
      from: config.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    return { sent: true as const };
  } catch (error) {
    console.error("Failed to send email to:", params.to, error);
    return { error: true as const };
  }
}
