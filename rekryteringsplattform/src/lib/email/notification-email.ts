import { createAdminClient } from "@/lib/supabase/admin";
import { sendUserEmail } from "./internal-notifications";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://recruito.eu";

function renderTemplate({
  title,
  body,
  link,
}: {
  title: string;
  body: string;
  link: string | null;
}): string {
  const cta = link
    ? `<tr>
         <td style="padding:24px 0 0 0;">
           <a href="${APP_URL}${link}"
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
                You're receiving this because you have a Recruito account.
                Manage email preferences in your
                <a href="${APP_URL}/recruiter/profile" style="color:#0b5fff;text-decoration:none;">profile settings</a>.
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Fire-and-forget notification email. Looks up the user's email + opt-out
 * flag from `profiles`, renders a branded template, and dispatches via SMTP.
 * Never throws — failures are logged and swallowed so they don't block the
 * underlying transactional action that created the in-app notification.
 */
export async function sendNotificationEmail(
  userId: string,
  title: string,
  body: string,
  link: string | null
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("email, email_opt_out")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.email) return;
    if ((profile as any).email_opt_out) return;

    const html = renderTemplate({ title, body, link });
    await sendUserEmail({
      to: profile.email,
      subject: title,
      html,
    });
  } catch (err) {
    console.error("sendNotificationEmail failed:", err);
  }
}
