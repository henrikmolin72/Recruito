import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { getAppUrl } from "@/lib/app-url";
import { sendUserEmail } from "@/lib/email/internal-notifications";
import { jobLifecycleEmail } from "@/lib/email/email-templates";
import { statusChangeTimestampPatch, isCandidateInProcess } from "@/lib/candidate-workflow";
import { logCandidateStageChange } from "@/lib/candidate-stage-history";
import { candidateInStage, openPositionsFilled } from "@/lib/mandate-stages";

// Only candidates still in process are auto-rejected: hired-pipeline candidates
// are protected, and terminal statuses (withdrawn, duplicate, already rejected…)
// must never be overwritten with rejected_client.
const REJECT_TARGET_STATUS = "rejected_client";

type AdminClient = ReturnType<typeof createAdminClient>;
type JobNotifyContext = { title: string; status: string | null; reopenNudgeSentAt: string | null; companyUserId: string | null };

async function getJobNotifyContext(admin: AdminClient, jobId: string): Promise<JobNotifyContext | null> {
    const { data } = await admin
        .from("jobs")
        .select("title, status, reopen_nudge_sent_at, company:companies(user_id)")
        .eq("id", jobId)
        .single();
    if (!data) return null;
    const company = Array.isArray((data as any).company) ? (data as any).company[0] : (data as any).company;
    return {
        title: (data as any).title || "Position",
        status: (data as any).status ?? null,
        reopenNudgeSentAt: (data as any).reopen_nudge_sent_at ?? null,
        companyUserId: company?.user_id ?? null,
    };
}

/**
 * Reject every non-hired candidate on a job (optionally except the one just
 * hired). Used when a job is closed or a position is filled. Notifies each
 * affected recruiter once. Best-effort; returns the number rejected.
 *
 * Uses the admin client because RLS does not let a company directly mutate
 * candidate.status — this is an authorized server-side cascade.
 */
export async function rejectRemainingCandidates(jobId: string, opts: { exceptCandidateId?: string } = {}): Promise<number> {
    const admin = createAdminClient();
    const { data: rows, error } = await admin
        .from("candidates")
        .select("id, recruiter_id, status")
        .eq("job_id", jobId);
    if (error || !rows) {
        console.error("[rejectRemainingCandidates] fetch", error?.message);
        return 0;
    }

    const targets = rows.filter(
        (c: any) =>
            c.id !== opts.exceptCandidateId &&
            isCandidateInProcess(c.status)
    );
    if (targets.length === 0) return 0;

    const { error: updErr } = await admin
        .from("candidates")
        .update({ status: REJECT_TARGET_STATUS, ...statusChangeTimestampPatch(REJECT_TARGET_STATUS) })
        .in("id", targets.map((c: any) => c.id));
    if (updErr) {
        console.error("[rejectRemainingCandidates] update", updErr.message);
        return 0;
    }

    // Audit row per system-rejected candidate (best-effort; never aborts the
    // cascade). action "reject", reason "position_filled", changed_by null.
    await Promise.allSettled(
        targets.map((c: any) =>
            logCandidateStageChange({
                candidateId: c.id,
                jobId,
                fromStage: null,
                toStage: "rejected",
                action: "reject",
                changedBy: null,
                changedByRole: "system",
                reason: "position_filled",
            })
        )
    );

    // Notify each affected recruiter once that their candidate(s) were rejected.
    try {
        const recruiterIds = [...new Set(targets.map((c: any) => c.recruiter_id).filter(Boolean))];
        if (recruiterIds.length) {
            const ctx = await getJobNotifyContext(admin, jobId);
            const { data: recs } = await admin.from("recruiters").select("id, user_id").in("id", recruiterIds);
            for (const r of recs || []) {
                if ((r as any).user_id) {
                    await createNotification((r as any).user_id, {
                        titleKey: "notif.jobFilledRejectedTitle",
                        bodyKey: "notif.jobFilledRejectedBody",
                        params: { jobTitle: ctx?.title || "Position" },
                        link: "/recruiter/mandates",
                    });
                }
            }
        }
    } catch (e) {
        console.error("[rejectRemainingCandidates] notify", e);
    }

    return targets.length;
}

/**
 * Auto-fill-on-hire path: fill the job and reject the rest ONLY once the hires
 * meet the target headcount (jobs.open_positions, default 1). A multi-position
 * job that still needs more hires stays active/paused and keeps its remaining
 * candidates in process (client request 2026-08-21). Call this after the hired
 * candidate's status is already persisted, so the count includes them.
 *
 * NOTE: the explicit "close the position now" action (closeJobAfterHire) calls
 * markJobFilledAndReject directly and is intentionally NOT gated — an explicit
 * close must always close, even below headcount.
 */
export async function fillJobIfAllPositionsHired(jobId: string, hiredCandidateId: string): Promise<void> {
    const admin = createAdminClient();
    const { data: job } = await admin.from("jobs").select("open_positions").eq("id", jobId).single();
    const { data: rows } = await admin.from("candidates").select("status").eq("job_id", jobId);
    const hiredCount = (rows || []).filter((c: any) => candidateInStage({ status: c.status }, "hired")).length;
    if (openPositionsFilled(hiredCount, (job as any)?.open_positions)) {
        await markJobFilledAndReject(jobId, hiredCandidateId);
    }
}

/** Mark a job as filled (only from active/paused) and reject the remaining candidates. */
export async function markJobFilledAndReject(jobId: string, hiredCandidateId: string): Promise<void> {
    const admin = createAdminClient();
    const { data: job } = await admin.from("jobs").select("status").eq("id", jobId).single();
    const status = (job as any)?.status;
    if (status === "active" || status === "paused") {
        await admin.from("jobs").update({ status: "filled" }).eq("id", jobId);
    }
    await rejectRemainingCandidates(jobId, { exceptCandidateId: hiredCandidateId });
}

/**
 * On a paused job, if the client has only `threshold` (default 3) or fewer
 * candidates left to review, nudge them once to reopen the job. Deduped via
 * jobs.reopen_nudge_sent_at (cleared on resume). Best-effort.
 */
export async function maybeNudgeReopenForReview(jobId: string, threshold = 3): Promise<void> {
    try {
        const admin = createAdminClient();
        const ctx = await getJobNotifyContext(admin, jobId);
        if (!ctx || ctx.status !== "paused" || ctx.reopenNudgeSentAt || !ctx.companyUserId) return;

        const { data: rows } = await admin.from("candidates").select("status").eq("job_id", jobId);
        const remaining = (rows || []).filter((c: any) => isCandidateInProcess(c.status)).length;
        if (remaining > threshold) return;

        // Stamp first so concurrent status changes don't double-fire the nudge.
        await admin.from("jobs").update({ reopen_nudge_sent_at: new Date().toISOString() }).eq("id", jobId);
        await createNotification(ctx.companyUserId, {
            titleKey: "notif.reopenNudgeTitle",
            bodyKey: "notif.reopenNudgeBody",
            params: { jobTitle: ctx.title, count: remaining },
            link: `/company/jobs/${jobId}`,
        });
    } catch (e) {
        console.error("[maybeNudgeReopenForReview]", e);
    }
}

/**
 * Notify all recruiters with an active mandate on a job when its lifecycle state
 * changes (closed / paused / reopened): in-app bell (localized) + email.
 * Best-effort; failures swallowed. Honors email_opt_out.
 *
 * INTERNAL — deliberately kept out of any "use server" file so it is NOT exposed
 * as a public RPC endpoint a client could call to spam arbitrary recruiters.
 */
export async function notifyRecruitersOfJobLifecycleChange(
    jobId: string,
    transition: "closed" | "paused" | "reopened",
    reason?: string
): Promise<void> {
    try {
        const supabase = createAdminClient();
        const { data: jobRow } = await supabase
            .from("jobs")
            .select(`title, company:companies(company_name), mandates:job_mandates!inner(is_active, recruiter:recruiters(user_id))`)
            .eq("id", jobId)
            .eq("mandates.is_active", true)
            .single();
        if (!jobRow) return;

        const jobTitle = (jobRow as any).title || "Position";
        const companyName =
            (Array.isArray((jobRow as any).company)
                ? (jobRow as any).company[0]?.company_name
                : (jobRow as any).company?.company_name) || "Partner Company";

        const userIds: string[] = ((jobRow as any).mandates || [])
            .map((m: any) => (Array.isArray(m.recruiter) ? m.recruiter[0]?.user_id : m.recruiter?.user_id))
            .filter((id: string | null | undefined): id is string => !!id);

        if (userIds.length === 0) return;

        // A closed job's recruiter discovery page (/recruiter/jobs/[id]) now 404s —
        // closed jobs are no longer visible to recruiters there. Point the close
        // notice at the recruiter's mandates instead (the job shows under the
        // "Closed" tab). Paused/reopened keep linking to the job, which still loads.
        const link = transition === "closed" ? "/recruiter/mandates" : `/recruiter/jobs/${jobId}`;

        // In-app bell notifications (re-rendered in each viewer's locale). Best-effort.
        const NOTIF_KEYS: Record<string, { titleKey: string; bodyKey: string }> = {
            closed: { titleKey: "notif.jobClosedTitle", bodyKey: "notif.jobClosedBody" },
            paused: { titleKey: "notif.jobPausedTitle", bodyKey: "notif.jobPausedBody" },
            reopened: { titleKey: "notif.jobReopenedTitle", bodyKey: "notif.jobReopenedBody" },
        };
        const keys = NOTIF_KEYS[transition];
        await Promise.allSettled(
            userIds.map((uid) =>
                createNotification(uid, {
                    titleKey: keys.titleKey,
                    bodyKey: keys.bodyKey,
                    params: { jobTitle, reason: reason || "—" },
                    link,
                })
            )
        );

        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, email, full_name, email_opt_out")
            .in("id", userIds);

        const headline = transition === "closed" ? "Job closed" : transition === "paused" ? "Job paused" : "Job reopened";
        const bodyLine =
            transition === "closed"
                ? "The company has closed this job. No further candidates are needed."
                : transition === "paused"
                    ? "The company has paused this job. Please hold candidate submissions until further notice."
                    : "The company has reopened this job. You can resume submitting candidates.";

        const baseUrl = await getAppUrl();

        const results = await Promise.allSettled(
            (profiles || [])
                .filter((p: any) => p.email && !p.email_opt_out)
                .map((p: any) =>
                    sendUserEmail({
                        to: p.email,
                        subject: `${headline}: ${jobTitle}`,
                        html: jobLifecycleEmail({
                            recruiterName: p.full_name || "Recruiter",
                            jobTitle,
                            companyName,
                            headline,
                            bodyLine,
                            jobUrl: `${baseUrl}${link}`,
                        }),
                    })
                )
        );
        const failed = results.filter((r) => r.status === "rejected");
        if (failed.length > 0) {
            console.error(`[notifyRecruitersOfJobLifecycleChange] ${failed.length} send(s) failed`, failed.map((f) => (f as PromiseRejectedResult).reason));
        }
    } catch (err) {
        console.error("[notifyRecruitersOfJobLifecycleChange]", err);
    }
}
