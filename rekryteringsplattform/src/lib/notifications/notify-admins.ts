import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification, type NotificationContent } from "@/lib/notifications/create";

/**
 * Fan a single notification out to every admin. Admins aren't participants in
 * company/recruiter flows, so process changes they should oversee must be sent
 * explicitly. Reads admin profiles with the admin client so it works regardless
 * of the caller's auth context (e.g. a company-scoped server action).
 *
 * Best-effort: a failure here is logged and swallowed so it never blocks the
 * triggering action (closing a job must still succeed even if notifying fails).
 *
 * NOT a server action — must only be imported from server-side modules.
 */
export async function notifyAdmins(content: NotificationContent): Promise<void> {
    try {
        const admin = createAdminClient();
        const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin");
        if (!admins?.length) return;
        await Promise.all(admins.map((a: { id: string }) => createNotification(a.id, content)));
    } catch (err) {
        console.error("[notifyAdmins]", err);
    }
}
