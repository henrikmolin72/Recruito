import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildBiasReport } from "@/lib/compliance/bias-report";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const jobId = request.nextUrl.searchParams.get("jobId");
    if (!jobId) {
        return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Check access: admin or company owner
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    const isAdmin = profile?.role === "admin";

    if (!isAdmin) {
        const { data: job } = await admin
            .from("jobs")
            .select("company_id, company:companies(user_id)")
            .eq("id", jobId)
            .single();

        const company = Array.isArray((job as any)?.company) ? (job as any).company[0] : (job as any)?.company;
        if (!company || company.user_id !== user.id) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
    }

    // Computed on read from live candidate rows, NOT from ai_bias_reports.
    // That table (migration 027) has never had a writer, so this endpoint 404'd
    // on every job while the AI policy told companies bias monitoring was running.
    // ponytail: no cron, no snapshot table — the numbers are cheap to derive and
    // are then always current. Reinstate ai_bias_reports only if we need
    // point-in-time history for a regulator.
    const { data: candidates } = await admin
        .from("candidates")
        .select("status, ai_match_score, years_experience, location_city")
        .eq("job_id", jobId);

    const screened = (candidates ?? []).filter((c) => c.ai_match_score !== null);
    if (screened.length === 0) {
        return NextResponse.json({ report: null }, { status: 404 });
    }

    return NextResponse.json({ report: buildBiasReport(jobId, screened) });
}
