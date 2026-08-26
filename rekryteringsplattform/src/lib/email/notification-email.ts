import { createAdminClient } from "@/lib/supabase/admin";
import { sendUserEmail } from "./internal-notifications";

// Fallback only matters when NEXT_PUBLIC_APP_URL is unset; it must still be our
// own domain, since every link in an outgoing email is built from it.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://recruitomatch.com";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Refuse anything that isn't a same-origin path. Caller may pass null.
function safePath(link: string | null): string | null {
  if (!link) return null;
  if (!link.startsWith("/") || link.startsWith("//")) return null;
  return link;
}

// Where each role manages its email preferences (EmailPreferencesCard). Roles
// without a preferences UI (admin) get no footer link rather than a wrong one.
const SETTINGS_PATH_BY_ROLE: Record<string, string> = {
  recruiter: "/recruiter/profile",
  company: "/company/profile",
};

function renderTemplate({
  title,
  body,
  link,
  settingsPath,
}: {
  title: string;
  body: string;
  link: string | null;
  settingsPath: string | null;
}): string {
  const safeLink = safePath(link);
  const cta = safeLink
    ? `<tr>
         <td style="padding:24px 0 0 0;">
           <a href="${escapeHtml(`${APP_URL}${safeLink}`)}"
              style="background:#0b5fff;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px;display:inline-block;">
             View in Recruito
           </a>
         </td>
       </tr>`
    : "";

  return `
<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;padding:32px;">
          <tr>
            <td style="padding-bottom:16px;">
              <div style="font-weight:800;font-size:18px;color:#0b5fff;letter-spacing:-0.01em;">Recruito</div>
            </td>
          </tr>
          <tr>
            <td>
              <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#0f172a;line-height:1.3;">${escapeHtml(title)}</h1>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;white-space:pre-wrap;">${escapeHtml(body)}</p>
            </td>
          </tr>
          ${cta}
          <tr>
            <td style="padding-top:32px;border-top:1px solid #f1f5f9;margin-top:24px;">
              <p style="margin:24px 0 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
                You're receiving this because you have a Recruito account.${
                  settingsPath
                    ? `
                Manage email preferences in your
                <a href="${escapeHtml(`${APP_URL}${settingsPath}`)}" style="color:#0b5fff;text-decoration:none;">profile settings</a>.`
                    : ""
                }
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Plain-text fallback so anti-spam scoring isn't penalised by html-only mail.
function renderText({ title, body, link }: { title: string; body: string; link: string | null }): string {
  const safeLink = safePath(link);
  const cta = safeLink ? `\n\nOpen in Recruito: ${APP_URL}${safeLink}` : "";
  return `${title}\n\n${body}${cta}\n\n— Recruito`;
}

type ProfileWithOptOut = {
  email: string | null;
  email_opt_out: boolean | null;
  role: string | null;
};

/**
 * Fire-and-forget notification email. Looks up the user's email + opt-out
 * flag from `profiles`, renders a branded template, and dispatches via the
 * Resend → SMTP pipeline. Never throws — failures are logged and swallowed
 * so they don't block the underlying transactional action that created the
 * in-app notification.
 */
export async function sendNotificationEmail(
  userId: string,
  title: string,
  body: string,
  link: string | null
): Promise<void> {
  try {
    const admin = createAdminClient();
    // `email_opt_out` was added in migration 037. Cast the row shape rather
    // than `as any` so the field is typed at the call site; remove the cast
    // once `supabase gen types` is re-run.
    const { data: profile } = await admin
      .from("profiles")
      .select("email, email_opt_out, role")
      .eq("id", userId)
      .maybeSingle<ProfileWithOptOut>();

    if (!profile?.email) return;
    if (profile.email_opt_out) return;

    const settingsPath = SETTINGS_PATH_BY_ROLE[profile.role ?? ""] ?? null;
    const html = renderTemplate({ title, body, link, settingsPath });
    const text = renderText({ title, body, link });
    await sendUserEmail({
      to: profile.email,
      subject: title,
      html,
      text,
    });
  } catch (err) {
    console.error("sendNotificationEmail failed:", err);
  }
}
