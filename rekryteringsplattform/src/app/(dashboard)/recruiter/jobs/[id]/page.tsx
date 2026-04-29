import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { JobPreviewCard } from "@/components/dashboard/shared/job-preview-card";

async function getJob(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: job } = await supabase
        .from("jobs")
        .select(`
            *,
            company:companies(company_name, website, logo_url, linkedin_url)
        `)
        .eq("id", id)
        .eq("status", "active")
        .single();

    return job;
}

export default async function RecruiterJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const job = await getJob(id);

    if (!job) notFound();

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
            <JobPreviewCard job={job} variant="recruiter" />
        </div>
    );
}
