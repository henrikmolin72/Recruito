import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const { data: report } = await admin
        .from("ai_bias_reports")
        .select("*")
        .eq("job_id", jobId)
        .order("report_date", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!report) {
        return NextResponse.json({ report: null }, { status: 404 });
    }

    return NextResponse.json({ report });
}
