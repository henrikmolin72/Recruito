"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/actions/notifications";
import { validateCandidateForm } from "@/lib/validation/forms";

export async function createCandidate(mandateId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Get mandate and job info
    const { data: mandate } = await supabase
        .from("job_mandates")
        .select("job_id, recruiter_id")
        .eq("id", mandateId)
        .single();

    if (!mandate) {
        return { error: "Mandat kunde inte hittas." };
    }

    // Verify user is the recruiter owning this mandate
    const { data: recruiter } = await supabase
        .from("recruiters")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!recruiter || recruiter.id !== mandate.recruiter_id) {
        return { error: "Obehörig åtgärd." };
    }

    const parsed = validateCandidateForm(formData);
    if (!parsed.success) {
        return { error: parsed.error };
    }

    const cvFile = parsed.data.cv_file;

    let cvFilePath = null;

    if (cvFile.size > 0) {
        const fileExt = cvFile.name.split('.').pop();
        const fileName = `${mandate.job_id}/${recruiter.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
            .from('cvs')
            .upload(fileName, cvFile);

        if (uploadError) {
            console.error("CV Upload Error:", uploadError);
            return { error: "Kunde inte ladda upp CV." };
        }
        cvFilePath = data.path;
    }

    const { error: insertError } = await supabase
        .from("candidates")
        .insert({
            job_id: mandate.job_id,
            recruiter_id: recruiter.id,
            mandate_id: mandateId,
            first_name: parsed.data.first_name,
            last_name: parsed.data.last_name,
            email: parsed.data.email,
            phone: parsed.data.phone,
            linkedin_url: parsed.data.linkedin_url,
            current_title: parsed.data.current_title,
            current_company: parsed.data.current_company,
            years_experience: parsed.data.years_experience,
            expected_salary: parsed.data.expected_salary,
            cover_note: parsed.data.cover_note,
            cv_file_path: cvFilePath,
            status: 'submitted'
        });

    if (insertError) {
        console.error("Candidate Insert Error:", insertError);
        return { error: insertError.message };
    }

    // Notification: Notify Company Owner
    const { data: jobInfo } = await supabase
        .from("jobs")
        .select(`
            title,
            company:companies!inner (
                user_id
            )
        `)
        .eq("id", mandate.job_id)
        .single();

    if (jobInfo?.company) {
        const company = Array.isArray(jobInfo.company) ? jobInfo.company[0] : jobInfo.company;
        const targetUserId = company?.user_id;

        if (targetUserId) {
            await createNotification(
                targetUserId,
                "Ny kandidat presenterad!",
                `En kandidat (${parsed.data.first_name} ${parsed.data.last_name}) har presenterats för: ${jobInfo.title}`,
                `/company/jobs/${mandate.job_id}`
            );
        }
    }

    revalidatePath(`/recruiter/mandates`);
    revalidatePath(`/recruiter`); // Update stats
    redirect("/recruiter/mandates");
}

export async function updateCandidateStatus(candidateId: string, jobId: string, status: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Utloggad!" };

    const allowedStatuses = new Set([
        "submitted",
        "reviewing",
        "interview",
        "offered",
        "hired",
        "guarantee_period",
        "completed",
        "rejected",
        "declined",
        "paused",
    ]);
    if (!allowedStatuses.has(status)) {
        return { error: "Ogiltig kandidatstatus" };
    }

    // Verify user owns the company that owns the job
    const { data: job } = await supabase
        .from("jobs")
        .select("company:companies(user_id), title")
        .eq("id", jobId)
        .single();

    // Check permissions (Company Owner OR Admin)
    const companyData = job?.company;
    const companyUserId = Array.isArray(companyData) ? companyData[0]?.user_id : (companyData as any)?.user_id;
    const isOwner = companyUserId === user.id;
    if (!isOwner) {
        return { error: "Obehörig" };
    }

    const { error } = await supabase
        .from("candidates")
        .update({ status })
        .eq("id", candidateId);

    if (error) {
        return { error: error.message };
    }

    // Notify Recruiter about status change!
    const { data: candidate } = await supabase
        .from("candidates")
        .select("recruiter:recruiters(user_id), first_name, last_name")
        .eq("id", candidateId)
        .single();

    if ((candidate?.recruiter as any)?.user_id) {
        await createNotification(
            (candidate?.recruiter as any).user_id,
            "Statusuppdatering på kandidat",
            `Din kandidat ${candidate?.first_name} ${candidate?.last_name} har uppdaterats till: ${status} för uppdraget ${job?.title}.`,
            "/recruiter/mandates"
        );
    }

    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath(`/company/jobs/${jobId}/candidates/${candidateId}`);
    return { success: true };
}
