import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail } from "@/lib/email/notification-email";

// Strip CRLF to defend against email-header / log injection from caller-supplied titles.
function stripControl(s: string): string {
    return s.replace(/[\r\n\t\v\f]/g, " ").trim();
}

// Only allow same-origin paths; reject absolute or protocol-relative URLs.
function safePath(link: string | null | undefined): string | null {
    const v = link?.trim();
    if (!v) return null;
    if (!v.startsWith("/") || v.startsWith("//")) return null;
    return v;
}

/**
 * Server-internal notification creator. NOT a server action — must only be
 * imported from server-side modules (server actions, route handlers, server
 * components). Kept out of any "use server" file so it isn't exposed as a
 * public RPC endpoint that a client could call to spam arbitrary userIds.
 */
export async function createNotification(
    userId: string,
    title: string,
    body: string,
    link?: string | null,
) {
    const normalizedTitle = stripControl(title);
    const normalizedBody = body.trim();
    const normalizedLink = safePath(link);

    if (!normalizedTitle || !normalizedBody || !userId) return;

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        title: normalizedTitle,
        body: normalizedBody,
        link: normalizedLink,
    });

    if (error) {
        console.error("Failed to create notification:", error);
        return;
    }

    // Schedule the email for after the response is sent. `after()` keeps the
    // function instance alive on Vercel/Fluid Compute past response close, so
    // the send isn't killed mid-flight (which `void` would do). Failures are
    // swallowed inside sendNotificationEmail so they never block the action.
    after(() => sendNotificationEmail(userId, normalizedTitle, normalizedBody, normalizedLink));
}
