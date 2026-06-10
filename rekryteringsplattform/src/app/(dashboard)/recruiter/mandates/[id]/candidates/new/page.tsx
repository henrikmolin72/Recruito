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

// Load a draft the recruiter owns so the form can resume it. Returns the draft's
// text fields, or null if the draft doesn't exist / isn't theirs / isn't a draft.
async function getDraft(draftId: string, mandateId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: recruiter } = await supabase
        .from("recruiters").select("id").eq("user_id", user.id).single();
    if (!recruiter) return null;
    const { data: c } = await supabase
        .from("candidates")
        .select("id, status, recruiter_id, mandate_id, first_name, last_name, email, phone, linkedin_url, current_title, current_company, cover_note")
        .eq("id", draftId)
        .eq("status", "draft")
        .eq("recruiter_id", recruiter.id)
        .single();
    if (!c || (c as any).mandate_id !== mandateId) return null;
    const text: Record<string, string> = {};
    for (const k of ["first_name", "last_name", "email", "phone", "linkedin_url", "current_title", "current_company", "cover_note"]) {
        const v = (c as any)[k];
        if (v) text[k] = String(v);
    }
    return text;
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

    const draftText = draftId ? await getDraft(draftId, id) : null;

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
            initialDraftId={draftText ? draftId : null}
            initialDraftText={draftText ?? undefined}
        />
    );
}
