"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { runCandidateEvaluation } from "@/lib/screening/run-evaluation";
import { getAppUrl } from "@/lib/app-url";
import { createNotification } from "@/lib/notifications/create";
import { notifyAdmins } from "@/lib/notifications/notify-admins";
import { sendUserEmail } from "@/lib/email/internal-notifications";
import { candidateSubmissionEmail, candidateProgressEmail } from "@/lib/email/email-templates";
import { requireAdmin } from "@/lib/actions/require-admin";
import { REFERRAL_BLOCKED_JOB_STATUSES } from "@/lib/mandate-stages";
import type { PipelineStage } from "@/types/db-types";
import {
    canTransitionCandidateStatus,
    inferInterviewWorkflowStatus,
    isCandidateStatusValue,
    statusChangeTimestampPatch,
    CANDIDATE_WITHDRAW_REASON_KEYS,
    CANDIDATE_WITHDRAW_BLOCKED_STATUSES,
    rejectReasonLabel,
    withdrawReasonLabel,
    countCandidatesAgainstCap,
} from "@/lib/candidate-workflow";
import {
    getPlacementByCandidateId,
    sendPlacementInvoice,
    recalculateRecruiterMetrics,
} from "@/lib/actions/placements";
import { markJobFilledAndReject, maybeNudgeReopenForReview, notifyRecruitersOfJobLifecycleChange } from "@/lib/job-fill";
import { canTransition, canReopenTo, COMPANY_STAGES, COMPANY_STAGE_TO_STATUS, type CompanyStageValue } from "@/lib/candidate-stage-rules";
import { logCandidateStageChange } from "@/lib/candidate-stage-history";

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
            `${await getAppUrl()}` +
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
        .select("id, status, company_stage, company_viewed_at, current_pipeline_stage, job_id, recruiter:recruiters(user_id), mandate_id")
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

    await logCandidateStageChange({
        candidateId,
        jobId,
        fromStage: currentStatus ?? null,
        toStage: status,
        action: status === "hired" ? "hire" : "move",
        changedBy: user.id,
        changedByRole: "recruiter",
    });

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

    const { mandateId, candidateName } = await getCandidateMessagingContext(supabase, candidateId);
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
                const candidateUrl = `${await getAppUrl()}/company/jobs/${jobId}/candidates/${candidateId}`;
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

    await logCandidateStageChange({
        candidateId,
        jobId,
        fromStage: (access.candidate as any)?.company_stage ?? null,
        toStage: "withdrawn",
        action: "withdraw",
        changedBy: user.id,
        changedByRole: "recruiter",
        reason: withdrawReasonLabel(reason),
    });

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

    // Log the move with pipeline-stage titles (statuses can collapse to the
    // same value, e.g. screening → test both map to under_client_review).
    const fromStageTitle = stages?.find(
        (s) => s.id === (access.candidate as any)?.current_pipeline_stage
    )?.title ?? null;
    await logCandidateStageChange({
        candidateId,
        jobId,
        fromStage: fromStageTitle,
        toStage: targetStage.title,
        action: "move",
        changedBy: user.id,
        changedByRole: "recruiter",
    });

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
                const candidateUrl = `${await getAppUrl()}/recruiter/jobs/${jobId}#candidate/${candidateId}`;

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

export async function updateCompanyStage(candidateId: string, jobId: string, stage: string, reason?: string) {
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

    // Enforce the stage-progression matrix before writing: single forward step
    // or reject from each active rung; null (unviewed) -> only "viewed". A no-op
    // (stage === current) is allowed and skips the matrix check.
    const current = (access.candidate as any)?.company_stage ?? null;
    if (stage !== current && !canTransition(current, stage)) {
        return { error: "Ogiltigt stegbyte" };
    }

    // A client rejection must carry a structured reason (mirrors recruiter
    // withdrawal). The chosen reason's human label is stored on the audit row so
    // the stage-history timeline renders it directly.
    let rejectReasonText: string | null = null;
    if (stage === "rejected") {
        const label = reason ? rejectReasonLabel(reason) : null;
        if (!label) return { error: "Please select a reason for rejecting this candidate." };
        rejectReasonText = label;
    }

    const patch: Record<string, any> = { company_stage: stage };
    const isFirstView = stage === "viewed" && !(access.candidate as any)?.company_viewed_at;
    if (isFirstView) {
        patch.company_viewed_at = new Date().toISOString();
    }

    // Step 11 of recruitment process flow: keep candidate.status in sync with the
    // company stage so downstream automation (placement trigger, payouts,
    // analytics) AND the recruiter's status-derived views reflect the move. The
    // mapping is exhaustive (COMPANY_STAGE_TO_STATUS); null means the stage
    // deliberately leaves status unchanged (e.g. "viewed").
    const mappedStatus = COMPANY_STAGE_TO_STATUS[stage as CompanyStageValue];
    if (mappedStatus) {
        patch.status = mappedStatus;
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

    // Append the stage-progression audit row (best-effort). Hiring no longer
    // auto-closes the job — closing the position is a separate explicit company
    // action (closeJobAfterHire).
    await logCandidateStageChange({
        candidateId,
        jobId,
        fromStage: current,
        toStage: stage,
        action: stage === "rejected" ? "reject" : stage === "hired" ? "hire" : "move",
        changedBy: user.id,
        changedByRole: "company",
        reason: rejectReasonText,
    });

    // ── Stage-advancement notifications ──
    // Every forward company move (interview → hired/rejected) notifies BOTH the
    // owning recruiter (in-app bell) and Recruito admins, so no stage change goes
    // unseen. "viewed" is handled by the first-view ping above and is deliberately
    // not surfaced to admins. Offer/hire/reject additionally send the recruiter a
    // richer standalone email; for those we suppress the bell's generic email
    // (skipEmail) to avoid double-emailing.
    const STAGE_LABELS: Record<string, string> = {
        interview: "Interview",
        final_interview: "Final stage interview",
        job_offer: "Job offer",
        hired: "Hired",
        rejected: "Rejected",
    };
    const RICH_EMAIL: Record<string, { stage: string; subject: (n: string) => string }> = {
        job_offer: { stage: "Job offer sent", subject: (n) => `Offer sent to ${n}` },
        hired: { stage: "Hired", subject: (n) => `${n} was hired` },
        rejected: { stage: "Rejected", subject: (n) => `${n} was rejected` },
    };
    if (stage !== current && STAGE_LABELS[stage]) {
        const { recruiterUserId, mandateId, candidateName } =
            await getCandidateMessagingContext(supabase, candidateId);
        const stageLabel = STAGE_LABELS[stage];
        const jobTitle = access.job?.title || "—";
        const name = candidateName || "—";

        // Recruiter: in-app bell for the move (+ richer standalone email on
        // offer/hire/reject, whose bell email is suppressed to avoid duplicates).
        if (recruiterUserId) {
            const rich = RICH_EMAIL[stage];
            try {
                await createNotification(recruiterUserId, {
                    titleKey: "notif.companyStageMovedTitle",
                    bodyKey: "notif.companyStageMovedBody",
                    params: { candidate: name, stage: stageLabel, jobTitle },
                    link: mandateId
                        ? `/recruiter/mandates/${mandateId}/candidates/${candidateId}`
                        : "/recruiter/mandates",
                    skipEmail: Boolean(rich),
                });
                if (rich) {
                    await sendRecruiterStageEmail(supabase, {
                        recruiterUserId,
                        candidateId,
                        jobId,
                        candidateName: name,
                        jobTitle,
                        stageLabel: rich.stage,
                        subject: rich.subject(name),
                    });
                }
            } catch (err) {
                console.error("[updateCompanyStage advancement recruiter notify]", err);
            }
        }

        // Admins: keep the specific hired/rejected copy; intermediate moves
        // (interview/final_interview/job_offer) use a generic stage-moved message.
        try {
            const adminContent =
                stage === "hired"
                    ? { titleKey: "notif.adminCandidateHiredTitle", bodyKey: "notif.adminCandidateHiredBody", params: { candidate: name, jobTitle } }
                    : stage === "rejected"
                        ? { titleKey: "notif.adminCandidateRejectedTitle", bodyKey: "notif.adminCandidateRejectedBody", params: { candidate: name, jobTitle } }
                        : { titleKey: "notif.adminCandidateStageMovedTitle", bodyKey: "notif.adminCandidateStageMovedBody", params: { candidate: name, stage: stageLabel, jobTitle } };
            await notifyAdmins({ ...adminContent, link: `/admin/candidates/${candidateId}` });
        } catch (err) {
            console.error("[updateCompanyStage advancement admin notify]", err);
        }
    }

    // Rejecting/advancing a candidate on a paused job may drop the review pool
    // to the reopen-nudge threshold.
    await maybeNudgeReopenForReview(jobId);

    revalidatePath(`/company/jobs/${jobId}/candidates/${candidateId}`);
    return { success: true };
}

// Restore status when a rejected candidate is reopened into a given stage. All
// targets are in-process per isCandidateInProcess() (under_client_review and
// offer_in_progress are both non-terminal, non-hired-pipeline workflow states),
// so the candidate re-enters the active review pool.
const REOPEN_STAGE_TO_STATUS: Record<string, string> = {
    interview: "under_client_review",
    final_interview: "under_client_review",
    job_offer: "offer_in_progress",
};

// Company reopens a previously-rejected candidate back into an active stage.
// Mirrors updateCompanyStage's auth/authorize; only the owning company may act.
export async function reopenCandidate(
    candidateId: string,
    jobId: string,
    targetStage: string,
    reason?: string,
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Utloggad!" };

    const access = await getActorRoleForCandidateAction(supabase, user.id, candidateId, jobId);
    if (access.actorRole !== "company") return { error: "Obehörig" };

    const candidate = access.candidate as any;
    if (candidate?.company_stage !== "rejected" && candidate?.status !== "rejected_client") {
        return { error: "Endast avvisade kandidater kan återupptas." };
    }

    if (!canReopenTo(targetStage)) {
        return { error: "Ogiltigt steg för återupptagning." };
    }

    const restoredStatus = REOPEN_STAGE_TO_STATUS[targetStage];
    const { error } = await supabase
        .from("candidates")
        .update({
            company_stage: targetStage,
            status: restoredStatus,
            ...statusChangeTimestampPatch(restoredStatus),
        })
        .eq("id", candidateId)
        .eq("job_id", jobId);

    if (error) {
        console.error("[ServerAction]", error);
        return { error: "Något gick fel. Försök igen." };
    }

    await logCandidateStageChange({
        candidateId,
        jobId,
        fromStage: "rejected",
        toStage: targetStage,
        action: "reopen",
        changedBy: user.id,
        changedByRole: "company",
        reason: reason ?? null,
    });

    // Notify the recruiter their candidate is back in play (best-effort).
    try {
        const { recruiterUserId, mandateId, candidateName } =
            await getCandidateMessagingContext(supabase, candidateId);
        if (recruiterUserId) {
            await createNotification(recruiterUserId, {
                titleKey: "notif.candidateReopenedTitle",
                bodyKey: "notif.candidateReopenedBody",
                params: { subject: access.job?.title || "—", candidate: candidateName || "—" },
                link: mandateId
                    ? `/recruiter/mandates/${mandateId}/candidates/${candidateId}`
                    : "/recruiter/mandates",
            });
        }
    } catch (err) {
        console.error("[reopenCandidate notify]", err);
    }

    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath(`/company/jobs/${jobId}/candidates/${candidateId}`);
    if (access.mandateId) {
        revalidatePath(`/recruiter/mandates/${access.mandateId}`);
        revalidatePath(`/recruiter/mandates/${access.mandateId}/candidates/${candidateId}`);
    }

    return { success: true };
}

// Explicit "close the position now that we've hired" action. Hiring no longer
// auto-closes the job (see updateCompanyStage); the company decides separately.
// Fills the job (active/paused -> filled), rejects the remaining candidates, and
// notifies the affected recruiters.
export async function closeJobAfterHire(jobId: string, hiredCandidateId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Utloggad!" };

    // Company-ownership check (IDOR guard): the actor must own the job the hired
    // candidate belongs to. Reuses the shared access helper.
    const access = await getActorRoleForCandidateAction(supabase, user.id, hiredCandidateId, jobId);
    if (access.actorRole !== "company") return { error: "Obehörig" };

    try {
        await markJobFilledAndReject(jobId, hiredCandidateId);
        await notifyRecruitersOfJobLifecycleChange(jobId, "closed");
    } catch (err) {
        console.error("[closeJobAfterHire]", err);
        return { error: "Något gick fel. Försök igen." };
    }

    try {
        const { candidateName } = await getCandidateMessagingContext(supabase, hiredCandidateId);
        await notifyAdmins({
            titleKey: "notif.adminJobFilledTitle",
            bodyKey: "notif.adminJobFilledBody",
            params: { jobTitle: access.job?.title || "—", candidate: candidateName || "—" },
            link: `/admin/candidates/${hiredCandidateId}`,
        });
    } catch (err) {
        console.error("[closeJobAfterHire admin notify]", err);
    }

    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath(`/company/jobs/${jobId}/candidates/${hiredCandidateId}`);
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

    await logCandidateStageChange({
        candidateId,
        jobId,
        fromStage: "job_offer",
        toStage: "offer_accepted",
        action: "move",
        changedBy: user.id,
        changedByRole: "company",
    });

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

    await notifyAdmins({
        titleKey: "notif.adminOfferAcceptedTitle",
        bodyKey: "notif.adminOfferAcceptedBody",
        params: { candidate: ctx.candidateName || "—", jobTitle: access.job?.title || "—" },
        link: `/admin/candidates/${candidateId}`,
    });

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

    // A paused or company-ended job no longer accepts presentations to the client.
    // Block BEFORE marking the candidate screened/visible so an admin can't push an
    // in-flight candidate through to a paused job and notify the company. The
    // cap-triggering presentation itself still goes through: the auto-pause below
    // flips status to "paused" only AFTER this point, so at entry it is still
    // "active". Mirrors the recruiter-side createCandidateExtended gate.
    const { data: screenJob } = await createAdminClient()
        .from("candidates")
        .select("job:jobs(status)")
        .eq("id", candidateId)
        .single();
    const screenJobStatus = Array.isArray((screenJob as any)?.job)
        ? (screenJob as any).job[0]?.status
        : (screenJob as any)?.job?.status;
    if (REFERRAL_BLOCKED_JOB_STATUSES.has(screenJobStatus)) {
        return { error: "This job is not currently accepting candidates." };
    }

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
            .select("first_name, last_name, job_id, mandate_id")
            .eq("id", candidateId)
            .single();

        // Auto-run the AI evaluation so the company sees a match score at approval
        // time. Non-blocking (after()) so the approval returns immediately; the
        // score lands a few seconds later. setScore=true: this is Recruito's run, so
        // it owns the company-visible ai_match_score. Best-effort — a missing CV or
        // DOCX (eval handles PDF/TXT only) just yields no score, never blocks.
        const mandateId = (cand as any)?.mandate_id as string | undefined;
        if (mandateId) {
            after(async () => {
                try {
                    const res = await runCandidateEvaluation({
                        admin: createAdminClient(),
                        mandateId,
                        candidateId,
                        actorUserId: user.id,
                        setScore: true,
                    });
                    if (!res.ok) console.warn("[markCandidateRecruitoScreened auto-eval]", res.error);
                } catch (e) {
                    console.error("[markCandidateRecruitoScreened auto-eval]", e);
                }
            });
        }

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

            // Auto-pause counts only APPROVED candidates (recruito_screened_at set) —
            // deliberately a DIFFERENT, looser count than the submission cap, which
            // counts occupied slots (countCandidatesAgainstCap, incl. un-screened
            // "reviewing" rows) in createCandidateExtended/claimMandate. The submission
            // gate stops new referrals once 8 slots are filled; this only flips the job
            // to "paused" once 8 are approved/delivered. Do NOT unify these two counts —
            // making the pause depend on approvals while submissions stop at occupancy
            // is intentional; merging them would let a 9th candidate slip in.
            //
            // But like every cap count it must run the approved rows through
            // candidateOccupiesCapSlot: a rejected/withdrawn candidate keeps its
            // recruito_screened_at, so counting raw approvals paused jobs on their
            // TOTAL history instead of their ACTIVE load (client-reported bug — a job
            // with 1 active + 7 rejected showed as paused at "8"). Excluding released
            // slots only ever pauses LATER, so the submission gate is unaffected.
            const maxCandidates = (job as any)?.max_candidates ?? 8;
            const { data: approvedRows } = await admin
                .from("candidates")
                .select("status")
                .eq("job_id", cand.job_id)
                .not("recruito_screened_at", "is", null);
            const approvedActiveCount = countCandidatesAgainstCap((approvedRows ?? []).map((r: any) => r.status));

            if (approvedActiveCount >= maxCandidates && (job as any)?.status === "active") {
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
            job_id,
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

    await logCandidateStageChange({
        candidateId,
        jobId: (candidate as any).job_id,
        fromStage: null,
        toStage: "recruito_rejected",
        action: "reject",
        changedBy: user.id,
        changedByRole: "admin",
        reason: trimmedReason,
    });

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
