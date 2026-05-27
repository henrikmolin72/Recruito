import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { JobPreviewCard } from "@/components/dashboard/shared/job-preview-card";
import { TakeMandateButton } from "@/components/dashboard/recruiter/take-mandate-button";

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
            company:companies(company_name, website, logo_url, linkedin_url)
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
            {normalized.status === "active" && (
                <div className="flex justify-end">
                    <TakeMandateButton jobId={normalized.id} />
                </div>
            )}
        </div>
    );
}
