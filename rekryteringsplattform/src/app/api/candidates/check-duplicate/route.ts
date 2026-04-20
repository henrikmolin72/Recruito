import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

function normalize(value: string | null | undefined) {
    return value?.trim().toLowerCase() || null;
}

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
        const email = normalize(String(formData.get("email") || ""));
        const linkedIn = normalize(String(formData.get("linkedin_url") || ""));

        if (!mandateId || (!email && !linkedIn)) {
            return NextResponse.json({ duplicate: false });
        }

        let mandateQuery = admin.from("job_mandates").select("job_id").eq("id", mandateId);
        if (!isAdmin) mandateQuery = mandateQuery.eq("recruiter_id", recruiterId as string);
        const { data: mandate } = await mandateQuery.single();
        if (!mandate) return NextResponse.json({ error: "Mandate not found" }, { status: 404 });

        const { data: sameJobCandidates } = await admin
            .from("candidates")
            .select("email, linkedin_url")
            .eq("job_id", (mandate as any).job_id);

        const duplicate = (sameJobCandidates || []).some((c: any) => {
            const ce = normalize(c.email);
            const cl = normalize(c.linkedin_url);
            return (email && ce === email) || (linkedIn && cl === linkedIn);
        });

        return NextResponse.json({ duplicate });
    } catch (err) {
        console.error("[check-duplicate]", err);
        return NextResponse.json({ error: "Check failed" }, { status: 500 });
    }
}
