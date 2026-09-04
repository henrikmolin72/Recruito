import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/server";
import { CandidateSubmissionForm } from "@/components/dashboard/recruiter/candidate-submission-form";
import { REFERRAL_BLOCKED_JOB_STATUSES } from "@/lib/mandate-stages";

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
        status,
        screening_questions,
        salary_max,
        salary_currency,
        company:companies(company_name)
      )
    `)
        .eq("id", id)
        .single();

    // A paused or company-ended job can't take new candidates — don't render the
    // form for it (the server action rejects it too). Null return → notFound().
    const job = Array.isArray((mandate as any)?.job) ? (mandate as any).job[0] : (mandate as any)?.job;
    if (job && REFERRAL_BLOCKED_JOB_STATUSES.has(job.status)) return null;

    return mandate;
}

// Load a draft the recruiter owns so the form can resume it. Returns the full
// candidate row (so every structured field — compensation, employment, notice,
// contact, screening — is restored, not just the text fields), or null if the
// draft doesn't exist / isn't theirs / isn't a draft.
async function getDraft(draftId: string, mandateId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: recruiter } = await supabase
        .from("recruiters").select("id").eq("user_id", user.id).single();
    if (!recruiter) return null;
    const { data: c } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", draftId)
        .eq("status", "draft")
        .eq("recruiter_id", recruiter.id)
        .single();
    if (!c || (c as any).mandate_id !== mandateId) return null;
    return c as Record<string, any>;
}

export default async function NewCandidatePage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ draftId?: string }>;
}) {
    const { id } = await params;
    const { draftId } = await searchParams;
    const mandate = await getMandate(id) as any;
    if (!mandate) notFound();

    const draftRow = draftId ? await getDraft(draftId, id) : null;

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
            jobSalaryMax={job.salary_max ?? null}
            jobSalaryCurrency={job.salary_currency ?? null}
            dict={r}
            initialDraftId={draftRow ? draftId : null}
            initialDraft={draftRow}
        />
    );
}
