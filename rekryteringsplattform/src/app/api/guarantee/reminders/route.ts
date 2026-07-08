/**
 * GET /api/guarantee/reminders
 * Cron endpoint — send T-14 and T-7 reminders for active guarantees,
 * and mark expired ones as completed.
 *
 * Secure with CRON_SECRET header. Schedule daily via Vercel Cron.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";

export const runtime = "nodejs";

function daysUntil(dateStr: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
    // Header-only auth: query-param secrets get persisted in access logs.
    // Vercel Cron sends Authorization: Bearer <CRON_SECRET>; we also accept
    // the legacy x-cron-secret header for direct curl/admin invocation.
    const authHeader = request.headers.get("authorization");
    const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const secret = bearerSecret ?? request.headers.get("x-cron-secret");
    if (!secret || secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: placements, error } = await admin
        .from("placements")
        .select(`
            id, guarantee_end_date, total_fee, salary_currency, company_id, recruiter_id,
            candidate:candidates!placements_candidate_id_fkey(first_name, last_name),
            job:jobs(title),
            company:companies(user_id)
        `)
        .eq("status", "guarantee_active")
        .not("guarantee_end_date", "is", null);

    if (error || !placements) {
        return NextResponse.json({ error: "Failed to fetch placements" }, { status: 500 });
    }

    // Get already-sent reminders
    const { data: alreadySent } = await admin
        .from("guarantee_reminders_sent")
        .select("placement_id, reminder_type")
        .in("placement_id", placements.map((p) => p.id));

    const sentSet = new Set((alreadySent ?? []).map((r) => `${r.placement_id}:${r.reminder_type}`));

    let sent = 0;
    const now = new Date().toISOString();

    for (const p of placements) {
        const days = daysUntil(p.guarantee_end_date);
        const candidate = Array.isArray(p.candidate) ? p.candidate[0] : p.candidate;
        const job = Array.isArray(p.job) ? p.job[0] : p.job;
        const company = Array.isArray(p.company) ? p.company[0] : p.company;
        const name = candidate ? `${candidate.first_name} ${candidate.last_name}` : "kandidaten";
        const jobTitle = job?.title ?? "uppdraget";
        const companyUserId = company?.user_id;

        // T-14 reminder
        if (days <= 14 && days > 7 && !sentSet.has(`${p.id}:t_minus_14`) && companyUserId) {
            await createNotification(companyUserId, {
                titleKey: "notif.guaranteeExpiringTitle",
                bodyKey: "notif.guaranteeExpiring14Body",
                params: { name, jobTitle, days },
                link: "/company/billing",
            });
            await admin.from("guarantee_reminders_sent").insert({ placement_id: p.id, reminder_type: "t_minus_14" });
            sent++;
        }

        // T-7 reminder
        if (days <= 7 && days > 0 && !sentSet.has(`${p.id}:t_minus_7`) && companyUserId) {
            await createNotification(companyUserId, {
                titleKey: "notif.guaranteeExpiringTitle",
                bodyKey: "notif.guaranteeExpiring7Body",
                params: { name, jobTitle, days },
                link: "/company/billing",
            });
            await admin.from("guarantee_reminders_sent").insert({ placement_id: p.id, reminder_type: "t_minus_7" });
            sent++;
        }

        // Expired — mark as completed
        if (days <= 0 && !sentSet.has(`${p.id}:expired`)) {
            await admin.from("placements").update({
                status: "payout_released",
                payout_released_at: now,
                completed_at: now,
                updated_at: now,
            }).eq("id", p.id);

            if (companyUserId) {
                await createNotification(companyUserId, {
                    titleKey: "notif.guaranteeCompletedTitle",
                    bodyKey: "notif.guaranteeCompletedBody",
                    params: { name, jobTitle },
                    link: "/company/billing",
                });
            }

            await admin.from("guarantee_reminders_sent").insert({ placement_id: p.id, reminder_type: "expired" });
            sent++;
        }
    }

    return NextResponse.json({ ok: true, checked: placements.length, notificationsSent: sent });
}
