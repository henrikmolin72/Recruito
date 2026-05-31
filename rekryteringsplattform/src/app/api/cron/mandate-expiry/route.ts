/**
 * GET /api/cron/mandate-expiry
 * Cron endpoint — notify recruiters whose active mandates have reached the
 * 10-day expiry without any candidate being submitted to the client
 * (recruito_screened_at still null on every candidate).
 *
 * Display-only policy: we do NOT auto-release the mandate here — the UI shows
 * "Expired". This job only sends a one-time heads-up notification.
 *
 * Secure with CRON_SECRET (Bearer header). Schedule daily via Vercel Cron.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { MANDATE_EXPIRY_DAYS } from "@/lib/mandate-stages";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    // Header-only auth: Vercel Cron sends Authorization: Bearer <CRON_SECRET>.
    // Also accept x-cron-secret for direct curl/admin invocation.
    const authHeader = request.headers.get("authorization");
    const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const secret = bearerSecret ?? request.headers.get("x-cron-secret");
    if (!secret || secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: mandates, error } = await admin
        .from("job_mandates")
        .select(`
            id,
            claimed_at,
            mandate_expiry_notified_at,
            recruiter:recruiters(user_id),
            job:jobs(title),
            candidates:candidates(recruito_screened_at)
        `)
        .eq("is_active", true);

    if (error || !mandates) {
        return NextResponse.json({ error: "Failed to fetch mandates" }, { status: 500 });
    }

    let notified = 0;
    for (const m of mandates as any[]) {
        if (!m.claimed_at) continue;

        // Fire at most once per mandate — survives missed daily runs (a single
        // skipped run must not permanently silence the notification).
        if (m.mandate_expiry_notified_at) continue;

        // Presented to client = any candidate screened by Recruito. Clears expiry.
        const presented = (m.candidates || []).some((c: any) => !!c.recruito_screened_at);
        if (presented) continue;

        const daysSinceClaim = Math.floor(
            (Date.now() - new Date(m.claimed_at).getTime()) / 86_400_000
        );
        // Fire on the first run at or after the expiry boundary, not only the
        // exact day — `>=` so a missed run still notifies on the next run.
        if (daysSinceClaim < MANDATE_EXPIRY_DAYS) continue;

        const recruiterUserId = Array.isArray(m.recruiter)
            ? m.recruiter[0]?.user_id
            : m.recruiter?.user_id;
        if (!recruiterUserId) continue;

        const jobTitle = (Array.isArray(m.job) ? m.job[0]?.title : m.job?.title) || "Uppdraget";

        await createNotification(recruiterUserId, {
            titleKey: "notif.mandateExpiredTitle",
            bodyKey: "notif.mandateExpiredBody",
            params: { jobTitle },
            link: "/recruiter/mandates",
        });

        // Stamp so the next run skips this mandate (dedupe). Done after the
        // notification so a send failure leaves it eligible for retry.
        await admin
            .from("job_mandates")
            .update({ mandate_expiry_notified_at: new Date().toISOString() })
            .eq("id", m.id);
        notified++;
    }

    return NextResponse.json({ ok: true, scanned: mandates.length, notified });
}
