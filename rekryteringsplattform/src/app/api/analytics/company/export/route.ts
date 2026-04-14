import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Fetch analytics from the main endpoint
    const base = new URL(request.url);
    base.pathname = "/api/analytics/company";
    const jobId = request.nextUrl.searchParams.get("jobId");
    if (jobId) base.searchParams.set("jobId", jobId);

    const resp = await fetch(base.toString(), {
        headers: { cookie: request.headers.get("cookie") ?? "" },
    });
    if (!resp.ok) return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });

    const data = await resp.json();

    // Build CSV sections
    const sections: string[] = [];

    // Summary
    sections.push("## SUMMARY");
    sections.push("Metric,Value");
    sections.push(`Total Jobs,${data.summary.totalJobs}`);
    sections.push(`Active Jobs,${data.summary.activeJobs}`);
    sections.push(`Total Candidates,${data.summary.totalCandidates}`);
    sections.push(`Total Hired,${data.summary.totalHired}`);
    sections.push(`Avg Days to Hire,${data.summary.avgDaysToHire ?? "-"}`);
    sections.push(`Total Saving vs Traditional Agency,${data.summary.totalSaving} ${data.summary.currency}`);
    sections.push("");

    // Hiring Funnel
    sections.push("## HIRING FUNNEL");
    sections.push("Job,Status,Submitted,AI Screened,AI Screened %,Interviewed,Interviewed %,Offered,Offered %,Hired,Hired %");
    for (const f of (data.funnel ?? [])) {
        sections.push([
            f.jobTitle, f.status, f.submitted, f.aiScreened, `${f.aiScreenedPct}%`,
            f.interviewed, `${f.interviewedPct}%`, f.offered, `${f.offeredPct}%`,
            f.hired, `${f.hiredPct}%`,
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    }
    sections.push("");

    // Cost Analysis
    sections.push("## COST ANALYSIS");
    sections.push("Job,Annual Salary,Recruito Fee,Traditional Agency Fee (20%),Saving,Saving %,Currency");
    for (const c of (data.costs ?? [])) {
        sections.push([
            c.jobTitle, c.annualSalary, c.recruiToCost, c.traditionalCost, c.saving, `${c.savingPct}%`, c.currency,
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    }
    sections.push("");

    // Recruiter Performance
    sections.push("## RECRUITER PERFORMANCE");
    sections.push("Recruiter,Jobs,Candidates Submitted,Hired,Conversion Rate,Avg AI Score,Avg Days to First Candidate");
    for (const r of (data.recruiterPerf ?? [])) {
        sections.push([
            r.name, r.jobCount, r.candidateCount, r.hiredCount,
            `${r.conversionRate}%`, r.avgAiScore ?? "-", r.avgDaysToFirstCandidate ?? "-",
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    }

    const csv = sections.join("\n");
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="recruito-analytics-${date}.csv"`,
        },
    });
}
