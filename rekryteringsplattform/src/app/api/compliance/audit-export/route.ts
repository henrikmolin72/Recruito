import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { csvEscapeCell } from "@/lib/csv";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    // Admin-only endpoint
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const jobId = request.nextUrl.searchParams.get("jobId");
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    let query = admin
        .from("ai_audit_log")
        .select(`
            id,
            action,
            actor_role,
            model,
            model_version,
            prompt_hash,
            input_summary,
            output_summary,
            created_at,
            job:jobs(title),
            application:applications(full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(5000);

    if (jobId) query = query.eq("job_id", jobId);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data: rows, error } = await query;

    if (error) {
        return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
    }

    if (!rows || rows.length === 0) {
        return NextResponse.json({ error: "No audit records found" }, { status: 404 });
    }

    // Build CSV
    const headers = [
        "id", "action", "actor_role", "model", "model_version", "prompt_hash",
        "job_title", "candidate_name", "score", "reasoning_count", "missing_skills_count",
        "cv_chars", "created_at",
    ];

    const csvRows = rows.map((r: any) => {
        const job = Array.isArray(r.job) ? r.job[0] : r.job;
        const app = Array.isArray(r.application) ? r.application[0] : r.application;
        const output = r.output_summary || {};
        const input = r.input_summary || {};
        return [
            r.id,
            r.action,
            r.actor_role || "",
            r.model || "",
            r.model_version || "",
            r.prompt_hash || "",
            job?.title || "",
            app?.full_name || "",
            output.score ?? "",
            output.reasoning_count ?? "",
            output.missing_skills_count ?? "",
            input.cv_chars ?? "",
            r.created_at,
        ]
            .map(csvEscapeCell)
            .join(",");
    });

    const csv = [headers.join(","), ...csvRows].join("\n");

    return new NextResponse(csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="ai-audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
    });
}
