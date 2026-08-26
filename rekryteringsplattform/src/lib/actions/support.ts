"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendUserEmail } from "@/lib/email/internal-notifications";
import { sendRecruiterSupportMessage } from "@/lib/actions/messages";
import { createNotification } from "@/lib/notifications/create";

export async function sendSupportRequest(jobId: string, message: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const trimmed = message.trim();
    if (trimmed.length < 10 || trimmed.length > 2000) {
        return { error: "Message must be between 10 and 2000 characters." };
    }

    const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();
    const { data: job } = await supabase.from("jobs").select("id, title").eq("id", jobId).single();
    if (!job) return { error: "Job not found." };

    // Support inbox reads via the admin panel regardless of which portal the
    // sender is on, so link the admin job page — it's always valid.
    const jobUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/admin/jobs/${job.id}`;
    const senderName = profile?.full_name || profile?.email || user.email || "Unknown user";

    const bodyLines = [
        `From: ${senderName} (${profile?.email || user.email || "no email"})`,
        `Job: ${job.title}`,
        `Job link: ${jobUrl}`,
        `Job ID: ${job.id}`,
        "",
        trimmed,
    ];
    const text = bodyLines.join("\n");
    const html = bodyLines.map((line) => line || "&nbsp;").join("<br/>");

    // In-app delivery is the primary channel — DB-backed, so it works with no
    // email provider configured (prod ran email-only and every support send
    // failed with "Could not send your message"). Recruiters land in their
    // existing Recruito support thread (which also notifies admins); any other
    // sender (company) falls back to direct admin notifications.
    let deliveredInApp = false;
    const threadResult = await sendRecruiterSupportMessage("", "", text);
    if (threadResult && "success" in threadResult) {
        deliveredInApp = true;
    } else {
        const supabaseAdmin = createAdminClient();
        const { data: admins } = await supabaseAdmin.from("profiles").select("id").eq("role", "admin");
        if (admins?.length) {
            await Promise.all(
                admins.map((a: { id: string }) =>
                    createNotification(a.id, {
                        title: `Support: ${job.title} — ${senderName}`,
                        body: text,
                        link: `/admin/jobs/${job.id}`,
                        // The richer support email is attempted below; don't double-send.
                        skipEmail: true,
                    }),
                ),
            );
            deliveredInApp = true;
        }
    }

    // Email mirror is best-effort: a missing provider or transient send failure
    // must not fail the request once the message is delivered in-app.
    const SUPPORT_TO = process.env.SUPPORT_EMAIL || process.env.INTERNAL_REVIEW_EMAIL || "";
    let emailSent = false;
    if (SUPPORT_TO) {
        const result = await sendUserEmail({
            to: SUPPORT_TO,
            // Operational mail to the support inbox, not a user notification.
            transactional: true,
            subject: `Support: ${job.title} — ${senderName}`,
            html,
            text,
        });
        emailSent = "sent" in result && !!result.sent;
        if (!emailSent) {
            console.warn("sendSupportRequest: support email mirror not sent", result);
        }
    } else {
        console.warn("sendSupportRequest: no support inbox configured (SUPPORT_EMAIL / INTERNAL_REVIEW_EMAIL)");
    }

    if (!deliveredInApp && !emailSent) {
        console.error("sendSupportRequest: all delivery channels failed");
        return { error: "Could not send your message. Please try again." };
    }

    return { success: true };
}
