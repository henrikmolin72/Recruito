import type { createAdminClient } from "@/lib/supabase/admin";

/**
 * A company may READ a candidate's skill tags only for candidates submitted to
 * its own jobs, and only once Recruito has approved the candidate. Mirrors the
 * visibility gate on the company candidate-detail page
 * (company/jobs/[id]/candidates/[candidateId]/page.tsx:getCandidate).
 *
 * Runs against the service-role admin client (RLS bypass), so this ownership
 * check is the trust boundary — it must stay fail-closed.
 */
export async function companyOwnsCandidate(
    candidateId: string,
    userId: string,
    admin: ReturnType<typeof createAdminClient>,
): Promise<boolean> {
    const { data } = await admin
        .from("candidates")
        .select("recruito_screened_at, job:jobs(company:companies(user_id))")
        .eq("id", candidateId)
        .single();
    if (!(data as any)?.recruito_screened_at) return false;
    const job = Array.isArray((data as any).job) ? (data as any).job[0] : (data as any).job;
    const company = Array.isArray(job?.company) ? job.company[0] : job?.company;
    return company?.user_id === userId;
}
