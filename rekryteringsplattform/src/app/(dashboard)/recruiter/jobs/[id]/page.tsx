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
            id,
            company_id,
            title,
            description,
            location,
            country,
            city,
            location_code,
            industry,
            is_confidential,
            employment_type,
            contract_duration,
            work_type,
            remote_type,
            work_permit_accepted,
            visa_sponsorship,
            salary_min,
            salary_max,
            salary_currency,
            salary_period,
            benefits,
            benefits_other,
            position_type,
            open_positions,
            experience_bracket,
            team_size,
            reporting_to,
            key_requirements,
            language_requirements,
            screening_questions,
            num_interviews,
            technical_test_required,
            assessment_type,
            working_hours,
            flexible_hours,
            travel_required,
            desired_start_date,
            recruiter_fee_amount,
            recruiter_fee_percentage,
            max_recruiters,
            current_recruiter_count,
            status,
            created_at,
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
            {/* Explicit column list above intentionally narrows the row to recruiter-visible fields. */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <JobPreviewCard job={job as any} variant="recruiter" />
        </div>
    );
}
