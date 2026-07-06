import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCompanyPlacementCountRecent } from "@/lib/actions/company";
import { getFeePercentage } from "@/lib/pricing";
import { CreateJobForm } from "../../new/create-job-form";

async function getJob(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: company } = await supabase.from("companies").select("id").eq("user_id", user.id).single();
    if (!company) return null;
    const { data: job } = await supabase.from("jobs").select("*").eq("id", id).eq("company_id", company.id).single();
    return job;
}

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const job = await getJob(id);
    if (!job) notFound();

    if (job.status !== "draft") {
        redirect(`/company/jobs/${id}`);
    }

    const recentPlacements = await getCompanyPlacementCountRecent();
    const feePercentage = job.fee_percentage ?? getFeePercentage(recentPlacements);

    return (
        <CreateJobForm
            feePercentage={feePercentage}
            editJobId={id}
            initialData={{
                title: job.title,
                country: job.country ?? "",
                city: job.city ?? "",
                location_code: job.location_code ?? "",
                location: job.location ?? "",
                industry: job.industry ?? "",
                is_confidential: job.is_confidential ?? false,
                employment_type: job.employment_type ?? "full_time",
                contract_duration: job.contract_duration ?? "",
                work_type: job.work_type ?? "",
                remote_type: job.remote_type ?? "",
                work_permit_accepted: job.work_permit_accepted ?? false,
                visa_sponsorship: job.visa_sponsorship ?? false,
                description: job.description ?? "",
                team_size: job.team_size ?? "",
                reporting_to: job.reporting_to ?? "",
                position_type: job.position_type ?? "",
                open_positions: job.open_positions,
                salary_min: job.salary_min,
                salary_currency: job.salary_currency ?? "EUR",
                salary_period: job.salary_period ?? "",
                benefits: (job.benefits as string[] | null) ?? [],
                benefits_other: job.benefits_other ?? "",
                guarantee_period_months: job.guarantee_period_months,
                num_interviews: job.num_interviews,
                technical_test_required: job.technical_test_required ?? false,
                assessment_type: job.assessment_type ?? "",
                working_hours: job.working_hours ?? "",
                flexible_hours: job.flexible_hours ?? false,
                shift_work: job.shift_work ?? "",
                shift_timings: job.shift_timings ?? "",
                overtime_policy: job.overtime_policy ?? "",
                desired_start_date: job.desired_start_date ?? "",
                urgency_level: job.urgency_level ?? "",
                travel_required: job.travel_required ?? false,
                final_interview_bonus: job.final_interview_bonus ?? false,
                screening_questions: (job.screening_questions as string[] | null) ?? [],
                key_requirements: (job.key_requirements as string[] | null) ?? [],
                language_requirements: (job.language_requirements as Array<{ language: string; level: string }> | null) ?? [],
            }}
        />
    );
}
