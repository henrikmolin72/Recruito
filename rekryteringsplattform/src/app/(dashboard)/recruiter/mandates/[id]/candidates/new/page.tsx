import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/server";
import { CandidateSubmissionForm } from "@/components/dashboard/recruiter/candidate-submission-form";

async function getMandate(id: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: mandate } = await supabase
        .from("job_mandates")
        .select(`
      id,
      job:jobs(
        title,
        screening_questions,
        company:companies(company_name)
      )
    `)
        .eq("id", id)
        .single();

    return mandate;
}

export default async function NewCandidatePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const mandate = await getMandate(id) as any;
    if (!mandate) notFound();

    const job = mandate.job;
    const company = Array.isArray(job.company) ? job.company[0] : job.company;

    const screeningQuestions: string[] = Array.isArray(job.screening_questions)
        ? job.screening_questions
        : [];

    const dict = await getDictionary();
    const r = dict.recruiter as Record<string, string>;

    return (
        <CandidateSubmissionForm
            mandateId={id}
            jobTitle={job.title}
            companyName={company?.company_name ?? ""}
            screeningQuestions={screeningQuestions}
            dict={r}
        />
    );
}
