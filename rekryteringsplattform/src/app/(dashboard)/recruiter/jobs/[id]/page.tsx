import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { JobPreviewCard } from "@/components/dashboard/shared/job-preview-card";
import { TakeMandateButton } from "@/components/dashboard/recruiter/take-mandate-button";
import { getJobProcessStats } from "@/lib/actions/recruiter";
import { Card, CardContent } from "@/components/ui/card";

async function getJob(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Match the listing's data access: recruiter is authenticated above; use the
    // admin client to bypass RLS that would otherwise hide the job row from the
    // recruiter and trigger a spurious 404.
    const adminClient = createAdminClient();
    const { data: job, error } = await adminClient
        .from("jobs")
        .select(`
            *,
            company:companies(company_name, website, logo_url)
        `)
        .eq("id", id)
        .in("status", ["active", "closed", "paused"])
        .maybeSingle();

    if (error) {
        console.error("[recruiter/jobs/[id]] getJob failed:", {
            id,
            message: error.message,
            code: (error as any).code,
            details: (error as any).details,
        });
    }

    return job;
}

export default async function RecruiterJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const job = await getJob(id);

    if (!job) notFound();

    const stats = await getJobProcessStats(id);

    // Supabase types the company join as an array; component expects a single object.
    const normalized = {
        ...job,
        company: Array.isArray(job.company) ? job.company[0] ?? null : job.company,
    };

    return (
        <div className="max-w-5xl mx-auto py-6 space-y-6">
            <div className="flex items-center gap-3">
                <Link href="/recruiter/jobs">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <span className="text-sm text-slate-500 font-medium">Back to Jobs</span>
            </div>
            <JobPreviewCard job={normalized} variant="recruiter" />

            {stats && (
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-baseline justify-between mb-4">
                            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Ongoing process</h2>
                            <p className="text-xs text-muted-foreground">Across all recruiters on this job</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                { label: "Presented", value: stats.presented, color: "text-slate-900" },
                                { label: "In process", value: stats.inProcess, color: "text-blue-600" },
                                { label: "In interview", value: stats.inInterview, color: "text-purple-600" },
                                { label: "Rejected", value: stats.rejected, color: "text-red-600" },
                            ].map((s) => (
                                <div key={s.label} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
                                    <div className={`text-2xl font-black tabular-nums ${s.color}`}>{s.value}</div>
                                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mt-0.5">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {normalized.status === "active" && (
                <div className="flex justify-end">
                    <TakeMandateButton jobId={normalized.id} />
                </div>
            )}
        </div>
    );
}
