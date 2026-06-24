/**
 * GET /api/cron/mandate-expiry
 * Cron endpoint — notify recruiters whose active mandates have reached the
 * 10-day expiry. A live (non-rejected) candidate suspends the timer; once every
 * candidate is rejected the 10-day window restarts from the last rejection
 * (shared rule: mandateExpiryDaysLeft).
 *
 * On expiry this job (a) sends a one-time heads-up notification and (b) releases
 * the mandate (is_active=false, released_at set). Releasing frees the recruiter
 * slot and returns the job to the recruiter's available list with the "Already
 * Worked" tag, where it can be retaken as a fresh cycle (see claimMandate).
 *
 * Secure with CRON_SECRET (Bearer header). Schedule daily via Vercel Cron.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { releaseDueMandates } from "@/lib/mandate-expiry-release";

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

    // Notify + release every due mandate (shared with the recruiter marketplace
    // list so expired slots free up even between daily runs).
    const { scanned, notified } = await releaseDueMandates(admin);
    return NextResponse.json({ ok: true, scanned, notified });
}
