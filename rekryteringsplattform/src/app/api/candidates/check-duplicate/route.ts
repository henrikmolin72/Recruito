import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import {
    normalizeIdentity,
    candidateMatchesIdentity,
    isClientEngagementActiveStatus,
} from "@/lib/candidate-identity";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

        const admin = createAdminClient();
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
        const isAdmin = profile?.role === "admin";
        if (profile?.role !== "recruiter" && !isAdmin) {
            return NextResponse.json({ error: "Recruiter profile required" }, { status: 403 });
        }

        let recruiterId: string | null = null;
        if (!isAdmin) {
            const { data: recruiter } = await admin.from("recruiters").select("id").eq("user_id", user.id).single();
            if (!recruiter) return NextResponse.json({ error: "Recruiter profile required" }, { status: 403 });
            recruiterId = recruiter.id as string;
        }

        const rateLimit = consumeRateLimit({
            key: `api:check-duplicate:user:${user.id}`,
            limit: 60,
            windowMs: 10 * 60 * 1000,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
        }

        const formData = await request.formData();
        const mandateId = String(formData.get("mandate_id") || "");
        const email = normalizeIdentity(String(formData.get("email") || ""));
        const linkedIn = normalizeIdentity(String(formData.get("linkedin_url") || ""));

        if (!mandateId || (!email && !linkedIn)) {
            return NextResponse.json({ duplicate: false });
        }

        let mandateQuery = admin.from("job_mandates").select("job_id").eq("id", mandateId);
        if (!isAdmin) mandateQuery = mandateQuery.eq("recruiter_id", recruiterId as string);
        const { data: mandate } = await mandateQuery.single();
        if (!mandate) return NextResponse.json({ error: "Mandate not found" }, { status: 404 });

        const jobId = (mandate as any).job_id as string;

        // 1) Same-job duplicate (mirror createCandidate same-job rule).
        const { data: sameJobCandidates } = await admin
            .from("candidates")
            .select("email, linkedin_url")
            .eq("job_id", jobId);

        if ((sameJobCandidates || []).some((c: any) => candidateMatchesIdentity(c, email, linkedIn))) {
            return NextResponse.json({ duplicate: true, reason: "same_job" });
        }

        // 2) Same-company active engagement duplicate (mirror createCandidate
        //    client_already_engaged rule).
        const { data: jobRow } = await admin
            .from("jobs")
            .select("company_id")
            .eq("id", jobId)
            .single();
        const companyId = (jobRow as any)?.company_id as string | undefined;

        if (companyId) {
            const { data: companyJobs } = await admin
                .from("jobs")
                .select("id")
                .eq("company_id", companyId);

            const companyJobIds = (companyJobs || []).map((j: any) => j.id).filter(Boolean);
            if (companyJobIds.length > 0) {
                const { data: companyCandidates } = await admin
                    .from("candidates")
                    .select("job_id, email, linkedin_url, status")
                    .in("job_id", companyJobIds);

                const clientEngaged = (companyCandidates || []).some((c: any) =>
                    c.job_id !== jobId &&
                    candidateMatchesIdentity(c, email, linkedIn) &&
                    isClientEngagementActiveStatus(c.status),
                );
                if (clientEngaged) {
                    return NextResponse.json({ duplicate: true, reason: "client_already_engaged" });
                }
            }
        }

        // 3) Same-recruiter previously submitted (catches the most common
        //    user-error: "did I already submit this person?"). Skipped for admin.
        if (recruiterId) {
            const { data: recruiterCandidates } = await admin
                .from("candidates")
                .select("email, linkedin_url")
                .eq("recruiter_id", recruiterId);

            if ((recruiterCandidates || []).some((c: any) => candidateMatchesIdentity(c, email, linkedIn))) {
                return NextResponse.json({ duplicate: true, reason: "recruiter_already_submitted" });
            }
        }

        return NextResponse.json({ duplicate: false });
    } catch (err) {
        console.error("[check-duplicate]", err);
        return NextResponse.json({ error: "Check failed" }, { status: 500 });
    }
}
