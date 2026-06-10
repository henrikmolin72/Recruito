"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications/create";
import { sendUserEmail } from "@/lib/email/internal-notifications";
import { candidateSubmissionEmail, candidateProgressEmail } from "@/lib/email/email-templates";
import { validateCandidateForm } from "@/lib/validation/forms";
import { requireAdmin } from "@/lib/actions/require-admin";
import { verifyCvFileContent } from "@/lib/file-magic";
import type { PipelineStage } from "@/types/db-types";
import {
    canTransitionCandidateStatus,
    inferInterviewWorkflowStatus,
    isCandidateStatusValue,
    statusChangeTimestampPatch,
    CANDIDATE_WITHDRAW_REASON_KEYS,
    CANDIDATE_WITHDRAW_BLOCKED_STATUSES,
} from "@/lib/candidate-workflow";
import {
    getPlacementByCandidateId,
    sendPlacementInvoice,
    recalculateRecruiterMetrics,
} from "@/lib/actions/placements";
import { markJobFilledAndReject, maybeNudgeReopenForReview, notifyRecruitersOfJobLifecycleChange } from "@/lib/job-fill";

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

// Sends a "your candidate's status changed" email to the recruiter, honoring
// the profiles.email_opt_out preference (migration 037). Used for the offer
// sent / offer accepted / hired / rejected transitions in updateCompanyStage
// + markOfferAccepted. Reuses candidateProgressEmail since it already accepts
// an arbitrary stage label — no need for four near-identical templates.
async function sendRecruiterStageEmail(
    supabase: Awaited<ReturnType<typeof createClient>>,
    params: {
        recruiterUserId: string;
        candidateId: string;
        jobId: string;
        candidateName: string;
        jobTitle: string;
        stageLabel: string;
        subject: string;
    }
) {
    try {
        const { data: recruiterProfile } = await supabase
            .from("profiles")
            .select("email, full_name, email_opt_out")
            .eq("id", params.recruiterUserId)
            .single();

        if (!recruiterProfile?.email || (recruiterProfile as any).email_opt_out) return;

        const candidateUrl =
            `${process.env.NEXT_PUBLIC_APP_URL || "https://recruito.com"}` +
            `/recruiter/jobs/${params.jobId}#candidate/${params.candidateId}`;

        const emailHtml = candidateProgressEmail({
            recruiterName: recruiterProfile.full_name || "Recruiter",
            candidateName: params.candidateName || "A candidate",
            jobTitle: params.jobTitle || "Position",
            newStage: params.stageLabel,
            candidateUrl,
        });

        await sendUserEmail({
            to: recruiterProfile.email,
            subject: params.subject,
            html: emailHtml,
        });
    } catch (err) {
        console.error("[sendRecruiterStageEmail]", err);
    }
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
        .select("id, status, current_pipeline_stage, job_id, recruiter:recruiters(user_id), mandate_id")
        .eq("id", candidateId)
        .single();

    if (candidate && (candidate as any).job_id !== jobId) {
        return { job: null, candidate: null, companyUserId: null, recruiterUserId: null, actorRole: null, mandateId: null };
    }

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

import {
    normalizeIdentity,
    candidateMatchesIdentity,
    isClientEngagementActiveStatus,
} from "@/lib/candidate-identity";

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

    // Cap submissions per job (client-requested, default 8). Admin can raise
    // max_candidates once the client has reviewed the current batch.
    const { data: jobCap } = await admin
        .from("jobs")
        .select("max_candidates")
        .eq("id", mandate.job_id)
        .single();

    const maxCandidates = (jobCap as any)?.max_candidates ?? 8;
    const { count: currentCount } = await admin
        .from("candidates")
        .select("id", { count: "exact", head: true })
        .eq("job_id", mandate.job_id)
        .neq("status", "draft");

    if ((currentCount ?? 0) >= maxCandidates) {
        return {
            error: `Submission limit reached (${maxCandidates} candidates). The client must review the current batch before more can be submitted.`,
        };
    }

    const parsed = validateCandidateForm(formData);
    if (!parsed.success) {
        return { error: parsed.error };
    }

    // Workflow: a new candidate enters Recruito's internal review ("reviewing",
    // recruito_screened_at = null). It is NOT visible to the client and does not
    // notify them until an admin approves it (markCandidateRecruitoScreened).
    // Duplicate / client-already-engaged are auto-detected terminal exceptions.
    const normalizedEmail = normalizeIdentity(parsed.data.email);
    const normalizedLinkedIn = normalizeIdentity(parsed.data.linkedin_url);
    let initialStatus = "reviewing";

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
            candidate.status !== "draft" &&
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

    if (cvFile.size > 0) {
        const fileExt = (cvFile.name.split('.').pop() ?? "").toLowerCase();
        const allowedExts = new Set(["pdf", "doc", "docx", "txt", "rtf"]);
        if (!allowedExts.has(fileExt)) {
            return { error: "Tillåtna filtyper för CV är PDF, DOC, DOCX, TXT eller RTF." };
        }
        if (!(await verifyCvFileContent(cvFile, fileExt))) {
            return { error: "Filinnehåll matchar inte filtypen. Ladda upp en giltig CV-fil." };
        }
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
        return { error: "Något gick fel. Försök igen." };
    }

    // No client-facing side effects at creation: the candidate is in internal
    // review and invisible to the client. The "presented" notification and the
    // candidate-cap auto-pause now fire on Recruito approval
    // (markCandidateRecruitoScreened), when the candidate actually reaches the
    // client.

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
        { console.error("[ServerAction]", error); return { error: "Något gick fel. Försök igen." }; }
    }

    // Recruiter/company applying a status change should clear pending company request.
    await clearCompanyNextStepRequest(supabase, candidateId);

    // ── Placement automation hooks ──
    // When candidate moves to 'invoice_enabled', auto-send invoice
    if (status === "invoice_enabled") {
        try {
            const placement = await getPlacementByCandidateId(candidateId);
            if (placement) {
                await sendPlacementInvoice(placement.id);
            }
        } catch (e) {
            console.error("Auto-invoice failed for candidate:", candidateId, e);
        }
    }

    // Recalculate recruiter metrics on meaningful status changes
    if (["hired", "invoice_enabled", "guarantee_tracking", "completed"].includes(status)) {
        try {
            const { data: candidateRow } = await supabase
                .from("candidates")
                .select("recruiter_id")
                .eq("id", candidateId)
                .single();
            if (candidateRow?.recruiter_id) {
                await recalculateRecruiterMetrics(candidateRow.recruiter_id);
            }
        } catch (e) {
            console.error("Metrics recalculation failed:", e);
        }
    }

    // Hiring a candidate fills the position and auto-rejects the rest.
    if (status === "hired") {
        await markJobFilledAndReject(jobId, candidateId);
    }
    // If the client's review pool just dropped to the threshold on a paused
    // job, nudge them once to reopen for more candidates.
    await maybeNudgeReopenForReview(jobId);

    const { candidate, recruiterUserId, mandateId, candidateName } = await getCandidateMessagingContext(supabase, candidateId);
    const targetUserId = access.companyUserId;

    if (targetUserId) {
        await createNotification(targetUserId, {
            titleKey: "notif.candidateStatusUpdateTitle",
            bodyKey: "notif.candidateStatusUpdateBody",
            params: { candidate: candidateName || "kandidaten", status, jobTitle: access.job?.title || "uppdraget" },
            link: `/company/jobs/${jobId}/candidates/${candidateId}`,
        });
    }

    // Send email notification when candidate is submitted
    if (status === "submitted" && access.companyUserId && access.job) {
        try {
            const { data: company } = await supabase
                .from("companies")
                .select("id, company_name")
                .eq("user_id", access.companyUserId)
                .single();

            const { data: companyProfile } = await supabase
                .from("profiles")
                .select("email, full_name, email_opt_out")
                .eq("id", access.companyUserId)
                .single();

            if (companyProfile?.email && !(companyProfile as any).email_opt_out && access.candidate) {
                const candidateUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://recruito.com"}/company/jobs/${jobId}/candidates/${candidateId}`;
                const qualifications = (access.candidate as any)?.key_qualifications || "Professional experience in relevant field";

                const emailHtml = candidateSubmissionEmail({
                    companyName: company?.company_name || "Partner Company",
                    candidateName: candidateName || "A candidate",
                    candidateTitle: (access.candidate as any)?.current_title || "Professional",
                    jobTitle: access.job?.title || "Position",
                    qualifications,
                    candidateUrl,
                });

                await sendUserEmail({
                    to: companyProfile.email,
                    subject: `New candidate submitted: ${candidateName}`,
                    html: emailHtml,
                });
            }
        } catch (error) {
            console.error("Error sending candidate submission email:", error);
        }
    }

    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath(`/company/jobs/${jobId}/candidates/${candidateId}`);
    if (mandateId) {
        revalidatePath(`/recruiter/mandates/${mandateId}`);
        revalidatePath(`/recruiter/mandates/${mandateId}/candidates/${candidateId}`);
    }
    return { success: true };
}

// Recruiter withdraws their own candidate with a structured reason. Recruiters
// can no longer reject candidates; withdrawal is their only exit action.
export async function withdrawCandidate(candidateId: string, jobId: string, reason: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Du måste vara inloggad." };

    if (!CANDIDATE_WITHDRAW_REASON_KEYS.has(reason)) {
        return { error: "Ogiltig anledning för tillbakadragande." };
    }

    const access = await getActorRoleForCandidateAction(supabase, user.id, candidateId, jobId);
    if (!access.candidate || access.actorRole !== "recruiter") {
        return { error: "Obehörig åtgärd." };
    }
    // Withdrawal is allowed from Draft through Offer, never from Hired or
    // Rejected (or another terminal state).
    if (CANDIDATE_WITHDRAW_BLOCKED_STATUSES.has((access.candidate as any).status)) {
        return { error: "Kandidaten är redan avslutad och kan inte dras tillbaka." };
    }

    const admin = createAdminClient();
    const { error } = await admin
        .from("candidates")
        .update({
            status: "candidate_withdrawn",
            status_changed_at: new Date().toISOString(),
            withdrawn_at: new Date().toISOString(),
            withdraw_reason: reason,
        })
        .eq("id", candidateId);

    if (error) {
        console.error("[withdrawCandidate]", error);
        return { error: "Kunde inte dra tillbaka kandidaten." };
    }

    revalidatePath(`/company/jobs/${jobId}`);
    if (access.mandateId) {
        revalidatePath(`/recruiter/mandates/${access.mandateId}`);
        revalidatePath(`/recruiter/mandates/${access.mandateId}/candidates/${candidateId}`);
    }
    revalidatePath("/recruiter/mandates");
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

    if (error) {
        console.error("[ServerAction]", error);
        return { error: "Något gick fel. Försök igen." };
    }

    await clearCompanyNextStepRequest(supabase, candidateId);

    const { recruiterUserId, mandateId, candidateName } = await getCandidateMessagingContext(supabase, candidateId);
    const targetUserId = access.companyUserId;

    if (targetUserId) {
        await createNotification(targetUserId, {
            titleKey: "notif.candidateStageMovedTitle",
            bodyKey: "notif.candidateStageMovedBody",
            params: { candidate: candidateName || "kandidaten", stage: targetStage.title, jobTitle: job?.title || "uppdraget" },
            link: `/company/jobs/${jobId}/candidates/${candidateId}`,
        });
    }

    // Send email notification to recruiter when candidate progresses
    if (recruiterUserId && access.candidate) {
        try {
            const { data: recruiterProfile } = await supabase
                .from("profiles")
                .select("email, full_name, email_opt_out")
                .eq("id", recruiterUserId)
                .single();

            if (recruiterProfile?.email && !(recruiterProfile as any).email_opt_out) {
                const recruiterName = recruiterProfile.full_name || "Recruiter";
                const candidateUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://recruito.com"}/recruiter/jobs/${jobId}#candidate/${candidateId}`;

                const emailHtml = candidateProgressEmail({
                    recruiterName,
                    candidateName: candidateName || "A candidate",
                    jobTitle: job?.title || "Position",
                    newStage: targetStage.title,
                    candidateUrl,
                });

                await sendUserEmail({
                    to: recruiterProfile.email,
                    subject: `Candidate progressed: ${candidateName}`,
                    html: emailHtml,
                });
            }
        } catch (error) {
            console.error("Error sending candidate progress email:", error);
        }
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

    if (updateError) {
        console.error("[ServerAction]", updateError);
        return { error: "Något gick fel. Försök igen." };
    }

    const { recruiterUserId, mandateId, candidateName } = await getCandidateMessagingContext(supabase, candidateId);

    if (recruiterUserId) {
        const requestLabel = mapCompanyNextStepLabel(nextStep);
        await createNotification(recruiterUserId, {
            titleKey: "notif.nextStepRequestTitle",
            bodyKey: trimmedNote ? "notif.nextStepRequestBodyNote" : "notif.nextStepRequestBody",
            params: { request: requestLabel, candidate: candidateName || "kandidaten", jobTitle: access.job?.title || "uppdrag", note: trimmedNote },
            link: mandateId
                ? `/recruiter/mandates/${mandateId}/candidates/${candidateId}`
                : "/recruiter/mandates",
        });
    }

    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath(`/company/jobs/${jobId}/candidates/${candidateId}`);
    if (mandateId) {
        revalidatePath(`/recruiter/mandates/${mandateId}`);
        revalidatePath(`/recruiter/mandates/${mandateId}/candidates/${candidateId}`);
    }

    return { success: true };
}

const COMPANY_STAGES = ["viewed", "interview", "final_interview", "job_offer", "hired", "rejected"] as const;
export type CompanyStageValue = typeof COMPANY_STAGES[number];

export async function updateCompanyStage(candidateId: string, jobId: string, stage: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Utloggad!" };

    if (!COMPANY_STAGES.includes(stage as CompanyStageValue)) return { error: "Ogiltigt steg" };

    const access = await getActorRoleForCandidateAction(supabase, user.id, candidateId, jobId);
    if (access.actorRole !== "company") return { error: "Obehörig" };

    // A withdrawn candidate can no longer progress; only an admin can reopen.
    if ((access.candidate as any)?.status === "candidate_withdrawn") {
        return { error: "Kandidaten har dragits tillbaka och kan inte flyttas." };
    }

    const patch: Record<string, any> = { company_stage: stage };
    const isFirstView = stage === "viewed" && !(access.candidate as any)?.company_viewed_at;
    if (isFirstView) {
        patch.company_viewed_at = new Date().toISOString();
    }

    // Step 11 of recruitment process flow: keep candidate.status in sync with offer/hire/reject
    // transitions so downstream automation (placement trigger, payouts, analytics) sees the change.
    const STAGE_TO_STATUS: Record<string, string> = {
        job_offer: "offer_in_progress",
        hired: "hired",
        rejected: "rejected_client",
    };
    if (STAGE_TO_STATUS[stage]) {
        patch.status = STAGE_TO_STATUS[stage];
    }

    const { error } = await supabase
        .from("candidates")
        .update(patch)
        .eq("id", candidateId)
        .eq("job_id", jobId);

    if (error) {
        console.error("[ServerAction]", error);
        return { error: "Något gick fel. Försök igen." };
    }

    // Email recruiter for offer-sent / hired / rejected transitions
    const STAGE_EMAIL_LABEL: Record<string, { stage: string; subject: (name: string) => string }> = {
        job_offer: { stage: "Job offer sent", subject: (n) => `Offer sent to ${n}` },
        hired: { stage: "Hired", subject: (n) => `${n} was hired` },
        rejected: { stage: "Rejected", subject: (n) => `${n} was rejected` },
    };
    const emailConfig = STAGE_EMAIL_LABEL[stage];
    if (emailConfig) {
        const ctx = await getCandidateMessagingContext(supabase, candidateId);
        if (ctx.recruiterUserId) {
            await sendRecruiterStageEmail(supabase, {
                recruiterUserId: ctx.recruiterUserId,
                candidateId,
                jobId,
                candidateName: ctx.candidateName,
                jobTitle: access.job?.title || "Position",
                stageLabel: emailConfig.stage,
                subject: emailConfig.subject(ctx.candidateName || "candidate"),
            });
        }
    }

    // First-view recruiter ping: surfaces the 5-day response-window UX on the
    // recruiter side. Only fires on the first transition into 'viewed'.
    if (isFirstView) {
        try {
            const { recruiterUserId, mandateId, candidateName } =
                await getCandidateMessagingContext(supabase, candidateId);
            if (recruiterUserId) {
                await createNotification(recruiterUserId, {
                    titleKey: "notif.clientViewedCandidateTitle",
                    bodyKey: "notif.clientViewedCandidateBody",
                    params: { subject: access.job?.title || "—", candidate: candidateName || "—" },
                    link: mandateId
                        ? `/recruiter/mandates/${mandateId}/candidates/${candidateId}`
                        : "/recruiter/mandates",
                });
            }
        } catch (err) {
            console.error("[updateCompanyStage first-view notify]", err);
        }
    }

    // Company marking a candidate hired fills the position and rejects the rest.
    if (stage === "hired") {
        await markJobFilledAndReject(jobId, candidateId);
    }
    // Rejecting/advancing a candidate on a paused job may drop the review pool
    // to the reopen-nudge threshold.
    await maybeNudgeReopenForReview(jobId);

    revalidatePath(`/company/jobs/${jobId}/candidates/${candidateId}`);
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

// Step 11 of recruitment process flow: company marks an outstanding offer as accepted by candidate.
// Only valid when company_stage is 'job_offer'. Sets candidate.status = 'offer_accepted'.
export async function markOfferAccepted(candidateId: string, jobId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Utloggad!" };

    const access = await getActorRoleForCandidateAction(supabase, user.id, candidateId, jobId);
    if (access.actorRole !== "company") return { error: "Obehörig" };

    if ((access.candidate as any)?.company_stage !== "job_offer") {
        return { error: "Offer must be made before it can be accepted." };
    }

    const { error } = await supabase
        .from("candidates")
        .update({ status: "offer_accepted" })
        .eq("id", candidateId)
        .eq("job_id", jobId);

    if (error) {
        console.error("[markOfferAccepted]", error);
        return { error: "Kunde inte markera erbjudande som accepterat." };
    }

    const ctx = await getCandidateMessagingContext(supabase, candidateId);
    if (ctx.recruiterUserId) {
        await sendRecruiterStageEmail(supabase, {
            recruiterUserId: ctx.recruiterUserId,
            candidateId,
            jobId,
            candidateName: ctx.candidateName,
            jobTitle: access.job?.title || "Position",
            stageLabel: "Offer accepted",
            subject: `Offer accepted by ${ctx.candidateName || "candidate"}`,
        });
    }

    revalidatePath(`/company/jobs/${jobId}/candidates/${candidateId}`);
    if (access.mandateId) {
        revalidatePath(`/recruiter/mandates/${access.mandateId}/candidates/${candidateId}`);
    }
    return { success: true };
}

// Step 7 of recruitment process flow: Recruito admin marks a candidate as internally screened
// before the client sees them. Sets recruito_screened_at + recruito_screened_by.
export async function markCandidateRecruitoScreened(candidateId: string) {
    const { supabase, user } = await requireAdmin();

    const { error } = await supabase
        .from("candidates")
        .update({
            recruito_screened_at: new Date().toISOString(),
            recruito_screened_by: user.id,
        })
        .eq("id", candidateId)
        .is("recruito_screened_at", null);

    if (error) {
        console.error("[markCandidateRecruitoScreened]", error);
        return { error: "Kunde inte markera kandidat som screenad." };
    }

    // Now that the candidate is approved and visible to the client, fire the
    // client-facing side effects that used to run at submission time: notify the
    // company, and auto-pause the job once the approved-candidate cap is reached.
    try {
        const admin = createAdminClient();
        const { data: cand } = await admin
            .from("candidates")
            .select("first_name, last_name, job_id")
            .eq("id", candidateId)
            .single();

        if (cand?.job_id) {
            const { data: job } = await admin
                .from("jobs")
                .select("title, status, max_candidates, company:companies!inner(user_id)")
                .eq("id", cand.job_id)
                .single();
            const company = Array.isArray((job as any)?.company) ? (job as any).company[0] : (job as any)?.company;
            const companyUserId = company?.user_id as string | undefined;

            if (companyUserId) {
                await createNotification(companyUserId, {
                    titleKey: "notif.candidatePresentedTitle",
                    bodyKey: "notif.candidatePresentedBody",
                    params: { firstName: cand.first_name, lastName: cand.last_name, jobTitle: (job as any)?.title },
                    link: `/company/jobs/${cand.job_id}`,
                });
            }

            const maxCandidates = (job as any)?.max_candidates ?? 8;
            const { count: approvedCount } = await admin
                .from("candidates")
                .select("id", { count: "exact", head: true })
                .eq("job_id", cand.job_id)
                .not("recruito_screened_at", "is", null);

            if ((approvedCount ?? 0) >= maxCandidates && (job as any)?.status === "active") {
                await admin
                    .from("jobs")
                    .update({ status: "paused", pause_reason: "Candidate Limit Reached" })
                    .eq("id", cand.job_id);
                if (companyUserId) {
                    await createNotification(companyUserId, {
                        titleKey: "notif.candidateLimitReachedTitle",
                        bodyKey: "notif.candidateLimitReachedBody",
                        params: { jobTitle: (job as any)?.title || "Position", limit: maxCandidates },
                        link: `/company/jobs/${cand.job_id}`,
                    });
                }
                await notifyRecruitersOfJobLifecycleChange(cand.job_id, "paused", "Candidate Limit Reached");
            }
        }
    } catch (e) {
        console.error("[markCandidateRecruitoScreened side-effects]", e);
    }

    revalidatePath("/admin/candidates");
    revalidatePath("/company/candidates");
    return { success: true };
}

// Step 7 "Take action" → Reject: admin rejects a submission before the client
// sees it. Sets a terminal status + reason and notifies the submitting
// recruiter. The candidate is never recruito_screened, so it stays out of the
// client's view (recruito_screened_at is the visibility divider).
export async function rejectCandidateAtScreening(candidateId: string, reason: string) {
    const { user } = await requireAdmin();
    const admin = createAdminClient();

    const trimmedReason = (reason || "").trim();
    if (trimmedReason.length < 3) {
        return { error: "Please provide a reason for rejecting this candidate." };
    }
    if (trimmedReason.length > 1000) {
        return { error: "Reason is too long (max 1000 characters)." };
    }

    const { data: candidate, error: fetchError } = await admin
        .from("candidates")
        .select(`
            id,
            first_name,
            last_name,
            recruito_screened_at,
            recruito_rejected_at,
            job:jobs(title),
            recruiter:recruiters(user_id)
        `)
        .eq("id", candidateId)
        .single();

    if (fetchError || !candidate) {
        return { error: "Candidate could not be found." };
    }
    if (candidate.recruito_screened_at) {
        return { error: "This candidate has already been submitted to the client and cannot be rejected here." };
    }
    if (candidate.recruito_rejected_at) {
        return { error: "This candidate has already been rejected." };
    }

    const { error: updateError } = await admin
        .from("candidates")
        .update({
            status: "recruito_rejected",
            status_changed_at: new Date().toISOString(),
            recruito_rejected_at: new Date().toISOString(),
            recruito_rejected_by: user.id,
            recruito_reject_reason: trimmedReason,
        })
        .eq("id", candidateId)
        .is("recruito_screened_at", null)
        .is("recruito_rejected_at", null);

    if (updateError) {
        console.error("[rejectCandidateAtScreening]", updateError);
        return { error: "Could not reject the candidate. Please try again." };
    }

    // Notify the submitting recruiter so they know the candidate was not passed on.
    const job = Array.isArray((candidate as any).job) ? (candidate as any).job[0] : (candidate as any).job;
    const recruiter = Array.isArray((candidate as any).recruiter) ? (candidate as any).recruiter[0] : (candidate as any).recruiter;
    const recruiterUserId = recruiter?.user_id;
    if (recruiterUserId) {
        await createNotification(recruiterUserId, {
            titleKey: "notif.candidateRejectedScreeningTitle",
            bodyKey: "notif.candidateRejectedScreeningBody",
            params: {
                firstName: candidate.first_name || "",
                lastName: candidate.last_name || "",
                jobTitle: job?.title || "the position",
                reason: trimmedReason,
            },
            link: "/recruiter/mandates",
        });
    }

    revalidatePath("/admin/candidates");
    return { success: true };
}
