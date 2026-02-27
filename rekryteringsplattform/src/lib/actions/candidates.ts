"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/actions/notifications";
import { validateCandidateForm } from "@/lib/validation/forms";
import type { PipelineStage } from "@/types/db-types";
import {
    canTransitionCandidateStatus,
    inferInterviewWorkflowStatus,
    isCandidateStatusValue,
    normalizeCandidateStatusForWorkflow,
    statusChangeTimestampPatch,
    TERMINAL_CANDIDATE_STATUSES,
} from "@/lib/candidate-workflow";
import { createPlacement } from "@/lib/actions/placements";

type CandidateNextStepRequest =
    | "request_tests"
    | "pause_candidate"
    | "reject_candidate"
    | "proceed_to_hire";

async function getCandidateMessagingContext(supabase: Awaited<ReturnType<typeof createClient>>, candidateId: string) {
    const { data: candidate } = await supabase
        .from("candidates")
        .select(`
            id,
            mandate_id,
            first_name,
            last_name,
            recruiter:recruiters(user_id)
        `)
        .eq("id", candidateId)
        .single();

    const recruiterRecord = (candidate as any)?.recruiter;
    const recruiterUserId = Array.isArray(recruiterRecord) ? recruiterRecord[0]?.user_id : recruiterRecord?.user_id;

    return {
        candidate,
        recruiterUserId: recruiterUserId || null,
        mandateId: (candidate as any)?.mandate_id || null,
        candidateName: `${(candidate as any)?.first_name || ""} ${(candidate as any)?.last_name || ""}`.trim(),
    };
}

async function getActorRoleForCandidateAction(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string,
    candidateId: string,
    jobId: string
) {
    const { data: job } = await supabase
        .from("jobs")
        .select("id, title, company:companies(user_id), pipeline_stages")
        .eq("id", jobId)
        .single();

    const { data: candidate } = await supabase
        .from("candidates")
        .select("id, status, current_pipeline_stage, recruiter:recruiters(user_id), mandate_id")
        .eq("id", candidateId)
        .single();

    const companyData = job?.company;
    const companyUserId = Array.isArray(companyData) ? companyData[0]?.user_id : (companyData as any)?.user_id;
    const recruiterData = (candidate as any)?.recruiter;
    const recruiterUserId = Array.isArray(recruiterData) ? recruiterData[0]?.user_id : recruiterData?.user_id;

    const isCompany = companyUserId === userId;
    const isRecruiter = recruiterUserId === userId;

    return {
        job,
        candidate,
        companyUserId: companyUserId || null,
        recruiterUserId: recruiterUserId || null,
        actorRole: isCompany ? "company" : isRecruiter ? "recruiter" : null,
        mandateId: (candidate as any)?.mandate_id || null,
    };
}

async function clearCompanyNextStepRequest(
    supabase: Awaited<ReturnType<typeof createClient>>,
    candidateId: string
) {
    await supabase
        .from("candidates")
        .update({
            company_requested_next_step: null,
            company_requested_next_step_note: null,
            company_requested_next_step_at: null,
            company_requested_next_step_by: null,
        })
        .eq("id", candidateId)
        .not("company_requested_next_step", "is", null);
}

function mapCompanyNextStepLabel(nextStep: CandidateNextStepRequest) {
    const labels: Record<CandidateNextStepRequest, string> = {
        request_tests: "Begära tester",
        pause_candidate: "Pausa kandidaten",
        reject_candidate: "Avböja kandidaten",
        proceed_to_hire: "Gå vidare till anställa",
    };
    return labels[nextStep];
}

function normalizeIdentity(value: string | null | undefined) {
    return value?.trim().toLowerCase() || null;
}

function candidateMatchesIdentity(candidate: any, email: string | null, linkedinUrl: string | null) {
    const candidateEmail = normalizeIdentity(candidate?.email);
    const candidateLinkedIn = normalizeIdentity(candidate?.linkedin_url);

    const emailMatch = !!email && candidateEmail === email;
    const linkedInMatch = !!linkedinUrl && candidateLinkedIn === linkedinUrl;
    return emailMatch || linkedInMatch;
}

function isClientEngagementActiveStatus(status: string | null | undefined) {
    const normalized = normalizeCandidateStatusForWorkflow(status);
    return !TERMINAL_CANDIDATE_STATUSES.has(normalized);
}

export async function createCandidate(mandateId: string, formData: FormData) {
    const supabase = await createClient();
    const admin = createAdminClient();
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

    // Workflow validation before client review:
    // submitted -> duplicate check -> duplicate_rejected / client_already_engaged / under_client_review
    const normalizedEmail = normalizeIdentity(parsed.data.email);
    const normalizedLinkedIn = normalizeIdentity(parsed.data.linkedin_url);
    let initialStatus = "under_client_review";

    if (normalizedEmail || normalizedLinkedIn) {
        const { data: jobRow } = await admin
            .from("jobs")
            .select("id, company_id")
            .eq("id", mandate.job_id)
            .single();

        const companyId = (jobRow as any)?.company_id as string | undefined;

        const { data: sameJobCandidates } = await admin
            .from("candidates")
            .select("id, email, linkedin_url, status")
            .eq("job_id", mandate.job_id);

        const duplicate = (sameJobCandidates || []).some((candidate: any) =>
            candidateMatchesIdentity(candidate, normalizedEmail, normalizedLinkedIn)
        );

        if (duplicate) {
            initialStatus = "duplicate_rejected";
        } else if (companyId) {
            const { data: companyJobs } = await admin
                .from("jobs")
                .select("id")
                .eq("company_id", companyId);

            const companyJobIds = (companyJobs || []).map((j: any) => j.id).filter(Boolean);

            if (companyJobIds.length > 0) {
                const { data: companyCandidates } = await admin
                    .from("candidates")
                    .select("id, job_id, email, linkedin_url, status")
                    .in("job_id", companyJobIds);

                const clientEngaged = (companyCandidates || []).some((candidate: any) =>
                    candidate.job_id !== mandate.job_id &&
                    candidateMatchesIdentity(candidate, normalizedEmail, normalizedLinkedIn) &&
                    isClientEngagementActiveStatus(candidate.status)
                );

                if (clientEngaged) {
                    initialStatus = "client_already_engaged";
                }
            }
        }
    }

    const cvFile = parsed.data.cv_file;

    let cvFilePath = null;

    if (cvFile && cvFile.size > 0) {
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
            status: initialStatus,
            status_changed_at: new Date().toISOString(),
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

    if (jobInfo?.company && initialStatus === "under_client_review") {
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

    if (!isCandidateStatusValue(status)) {
        return { error: "Ogiltig kandidatstatus" };
    }

    const access = await getActorRoleForCandidateAction(supabase, user.id, candidateId, jobId);
    if (!access.actorRole) {
        return { error: "Obehörig" };
    }
    if (access.actorRole !== "recruiter") {
        return { error: "Endast rekryterare kan uppdatera kandidatstatus i pipeline." };
    }

    const currentStatus = (access.candidate as any)?.status as string | undefined;
    if (!canTransitionCandidateStatus(currentStatus, status)) {
        return { error: `Otillåten övergång från ${currentStatus || "okänd"} till ${status}.` };
    }

    const updatePatch: Record<string, any> = {
        status,
        ...statusChangeTimestampPatch(status),
    };

    // Leaving "on hold" should not keep legacy paused current stage semantics.
    if (status === "submitted" || status === "under_client_review" || status === "info_requested" || status === "resubmitted") {
        // Keep stage only if recruiter deliberately set stage separately.
        // No-op here.
    }

    const { error } = await supabase
        .from("candidates")
        .update(updatePatch)
        .eq("id", candidateId);

    if (error) {
        return { error: error.message };
    }

    // Recruiter/company applying a status change should clear pending company request.
    await clearCompanyNextStepRequest(supabase, candidateId);

    // Auto-create placement when candidate is hired or invoice_enabled
    if (status === "hired" || status === "invoice_enabled") {
        const placementResult = await createPlacement(candidateId, jobId);
        if (placementResult.error) {
            console.error("Failed to create placement:", placementResult.error);
        }
    }

    const { candidate, recruiterUserId, mandateId, candidateName } = await getCandidateMessagingContext(supabase, candidateId);
    const targetUserId = access.companyUserId;
    const actorLabel = "Rekryteraren";

    if (targetUserId) {
        await createNotification(
            targetUserId,
            "Statusuppdatering på kandidat",
            `${actorLabel} uppdaterade ${candidateName || "kandidaten"} till status: ${status} för ${access.job?.title || "uppdraget"}.`,
            `/company/jobs/${jobId}/candidates/${candidateId}`
        );
    }

    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath(`/company/jobs/${jobId}/candidates/${candidateId}`);
    if (mandateId) {
        revalidatePath(`/recruiter/mandates/${mandateId}`);
        revalidatePath(`/recruiter/mandates/${mandateId}/candidates/${candidateId}`);
    }
    return { success: true };
}

export async function moveCandidateToPipelineStage(
    candidateId: string,
    jobId: string,
    targetStageId: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Utloggad!" };

    const access = await getActorRoleForCandidateAction(supabase, user.id, candidateId, jobId);
    if (!access.actorRole) return { error: "Obehörig" };
    if (access.actorRole !== "recruiter") {
        return { error: "Endast rekryterare kan flytta kandidaten i pipelinen." };
    }
    const job = access.job;

    // Validate target stage exists in job pipeline
    const stages = job?.pipeline_stages as PipelineStage[];
    const targetStage = stages?.find(s => s.id === targetStageId);
    if (!targetStage) return { error: "Ogiltigt steg" };

    // Map pipeline stage type to candidate_status enum for backward compat
    const currentStatus = (access.candidate as any)?.status as string | undefined;
    let newStatus = "under_client_review";
    if (targetStage.type === "interview") {
        newStatus = inferInterviewWorkflowStatus(currentStatus, targetStage.title);
    } else if (targetStage.type === "screening" || targetStage.type === "test" || targetStage.type === "assessment") {
        newStatus = "under_client_review";
    }

    if (!canTransitionCandidateStatus(currentStatus, newStatus)) {
        return { error: `Otillåten övergång från ${currentStatus || "okänd"} till ${newStatus}.` };
    }

    const { error } = await supabase
        .from("candidates")
        .update({
            current_pipeline_stage: targetStageId,
            status: newStatus,
            ...statusChangeTimestampPatch(newStatus),
        })
        .eq("id", candidateId);

    if (error) return { error: error.message };

    await clearCompanyNextStepRequest(supabase, candidateId);

    const { recruiterUserId, mandateId, candidateName } = await getCandidateMessagingContext(supabase, candidateId);
    const targetUserId = access.companyUserId;
    const actorLabel = "Rekryteraren";

    if (targetUserId) {
        await createNotification(
            targetUserId,
            "Kandidat flyttad till nytt steg",
            `${actorLabel} flyttade ${candidateName || "kandidaten"} till "${targetStage.title}" för ${job?.title || "uppdraget"}.`,
            `/company/jobs/${jobId}/candidates/${candidateId}`
        );
    }

    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath(`/company/jobs/${jobId}/candidates/${candidateId}`);
    if (mandateId) {
        revalidatePath(`/recruiter/mandates/${mandateId}`);
        revalidatePath(`/recruiter/mandates/${mandateId}/candidates/${candidateId}`);
    }
    return { success: true };
}

export async function requestCandidateNextStep(
    candidateId: string,
    jobId: string,
    nextStep: CandidateNextStepRequest,
    note?: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Utloggad!" };

    const allowed = new Set<CandidateNextStepRequest>([
        "request_tests",
        "pause_candidate",
        "reject_candidate",
        "proceed_to_hire",
    ]);
    if (!allowed.has(nextStep)) return { error: "Ogiltigt nästa steg" };

    const access = await getActorRoleForCandidateAction(supabase, user.id, candidateId, jobId);
    if (access.actorRole !== "company") {
        return { error: "Endast företag kan skicka nästa steg-begäran." };
    }

    const nowIso = new Date().toISOString();
    const trimmedNote = note?.trim() || null;

    const { error: updateError } = await supabase
        .from("candidates")
        .update({
            company_requested_next_step: nextStep,
            company_requested_next_step_note: trimmedNote,
            company_requested_next_step_at: nowIso,
            company_requested_next_step_by: user.id,
        })
        .eq("id", candidateId)
        .eq("job_id", jobId);

    if (updateError) return { error: updateError.message };

    const { recruiterUserId, mandateId, candidateName } = await getCandidateMessagingContext(supabase, candidateId);

    if (recruiterUserId) {
        const requestLabel = mapCompanyNextStepLabel(nextStep);
        await createNotification(
            recruiterUserId,
            "Nytt nästa steg från beställaren",
            `${requestLabel} för ${candidateName || "kandidaten"} (${access.job?.title || "uppdrag"}).${trimmedNote ? ` Kommentar: ${trimmedNote}` : ""}`,
            mandateId
                ? `/recruiter/mandates/${mandateId}/candidates/${candidateId}`
                : "/recruiter/mandates"
        );
    }

    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath(`/company/jobs/${jobId}/candidates/${candidateId}`);
    if (mandateId) {
        revalidatePath(`/recruiter/mandates/${mandateId}`);
        revalidatePath(`/recruiter/mandates/${mandateId}/candidates/${candidateId}`);
    }

    return { success: true };
}

export async function clearCandidateNextStepRequest(candidateId: string, jobId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Utloggad!" };

    const access = await getActorRoleForCandidateAction(supabase, user.id, candidateId, jobId);
    if (!access.actorRole) return { error: "Obehörig" };

    await clearCompanyNextStepRequest(supabase, candidateId);

    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath(`/company/jobs/${jobId}/candidates/${candidateId}`);
    if (access.mandateId) {
        revalidatePath(`/recruiter/mandates/${access.mandateId}`);
        revalidatePath(`/recruiter/mandates/${access.mandateId}/candidates/${candidateId}`);
    }
    return { success: true };
}
