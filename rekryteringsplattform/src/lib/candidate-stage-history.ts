import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type StageHistoryAction = "move" | "reject" | "reopen" | "withdraw" | "hire";

/**
 * Append one row to candidate_stage_history (migration 052). Best-effort audit
 * trail for the candidate timeline: never throws and never blocks the caller's
 * primary mutation — a logging failure is swallowed with a console.error.
 *
 * Writes via the admin client because RLS exposes only SELECT to the involved
 * company/recruiter; inserts are server-side only.
 */
export async function logCandidateStageChange(input: {
    candidateId: string;
    jobId: string;
    fromStage: string | null;
    toStage: string;
    action: StageHistoryAction;
    changedBy: string | null;
    changedByRole: string | null;
    reason?: string | null;
}): Promise<void> {
    try {
        const admin = createAdminClient();
        const { error } = await admin.from("candidate_stage_history").insert({
            candidate_id: input.candidateId,
            job_id: input.jobId,
            from_stage: input.fromStage,
            to_stage: input.toStage,
            action: input.action,
            changed_by: input.changedBy,
            changed_by_role: input.changedByRole,
            reason: input.reason ?? null,
        });
        if (error) {
            console.error("[logCandidateStageChange]", error.message);
        }
    } catch (err) {
        console.error("[logCandidateStageChange]", err);
    }
}
