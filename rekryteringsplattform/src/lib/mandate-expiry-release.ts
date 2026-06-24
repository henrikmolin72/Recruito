import type { createAdminClient } from "@/lib/supabase/admin";
import { mandateExpiryDaysLeft } from "@/lib/mandate-stages";
import { createNotification } from "@/lib/notifications/create";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Release every mandate that has reached the shared 10-day expiry
 * (mandateExpiryDaysLeft <= 0): set is_active=false so it stops counting against
 * the job's recruiter-slot capacity, and notify the recruiter once.
 *
 * Notify and release are DECOUPLED on purpose: release always runs for a due
 * mandate, but the "your mandate expired" notification fires at most once
 * (guarded by mandate_expiry_notified_at). The previous coupling skipped the
 * whole mandate once notified, so a mandate that was notified-but-not-released
 * stayed is_active=true forever and permanently occupied a slot ("Slots Full"
 * with no active recruiter).
 *
 * Shared by the daily cron (whole table) and the recruiter marketplace list
 * (scoped to the listed jobs) so expired slots free up even if the cron lags.
 * A no-op when nothing is due.
 */
export async function releaseDueMandates(
    admin: AdminClient,
    opts?: { jobIds?: string[] },
): Promise<{ scanned: number; notified: number; released: number }> {
    let query = admin
        .from("job_mandates")
        .select(`
            id,
            claimed_at,
            mandate_expiry_notified_at,
            recruiter:recruiters(user_id),
            job:jobs(title),
            candidates:candidates(status, status_changed_at)
        `)
        .eq("is_active", true);

    if (opts?.jobIds) {
        if (opts.jobIds.length === 0) return { scanned: 0, notified: 0, released: 0 };
        query = query.in("job_id", opts.jobIds);
    }

    const { data: mandates, error } = await query;
    if (error || !mandates) return { scanned: 0, notified: 0, released: 0 };

    let notified = 0;
    let released = 0;
    const nowIso = new Date().toISOString();

    for (const m of mandates as any[]) {
        if (!m.claimed_at) continue;

        // Shared expiry rule: a live (non-rejected) candidate suspends the timer;
        // all-rejected restarts it from the last rejection. null => no expiry.
        const daysLeft = mandateExpiryDaysLeft({
            claimedAt: m.claimed_at,
            candidates: m.candidates || [],
        });
        if (daysLeft === null || daysLeft > 0) continue;

        // Notify once. Done before the release so a send failure leaves the
        // mandate active and eligible for retry on the next pass.
        if (!m.mandate_expiry_notified_at) {
            const recruiterUserId = Array.isArray(m.recruiter)
                ? m.recruiter[0]?.user_id
                : m.recruiter?.user_id;
            if (recruiterUserId) {
                const jobTitle = (Array.isArray(m.job) ? m.job[0]?.title : m.job?.title) || "Uppdraget";
                await createNotification(recruiterUserId, {
                    titleKey: "notif.mandateExpiredTitle",
                    bodyKey: "notif.mandateExpiredBody",
                    params: { jobTitle },
                    link: "/recruiter/mandates",
                });
                notified++;
            }
        }

        // Always release a due mandate — even one already notified — so a
        // notified-but-stranded mandate finally frees its slot.
        await admin
            .from("job_mandates")
            .update({
                is_active: false,
                released_at: nowIso,
                mandate_expiry_notified_at: m.mandate_expiry_notified_at ?? nowIso,
            })
            .eq("id", m.id);
        released++;
    }

    return { scanned: mandates.length, notified, released };
}
