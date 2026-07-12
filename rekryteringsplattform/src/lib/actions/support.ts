"use server";

import { createClient } from "@/lib/supabase/server";
import { sendUserEmail } from "@/lib/email/internal-notifications";

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

    const SUPPORT_TO = process.env.SUPPORT_EMAIL || process.env.INTERNAL_REVIEW_EMAIL || "";
    if (!SUPPORT_TO) {
        console.error("sendSupportRequest: no support inbox configured (SUPPORT_EMAIL / INTERNAL_REVIEW_EMAIL)");
        return { error: "Support is not available right now. Please try again later." };
    }

    const result = await sendUserEmail({
        to: SUPPORT_TO,
        subject: `Support: ${job.title} — ${senderName}`,
        html,
        text,
    });

    if (!("sent" in result) || !result.sent) {
        console.error("sendSupportRequest: email dispatch failed", result);
        return { error: "Could not send your message. Please try again." };
    }

    return { success: true };
}
