import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// GET /api/talent-pool?companyId=...&skills=...&q=...
export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const admin = createAdminClient();

    // Verify company ownership
    const { data: company } = await admin
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 403 });

    const { data: entries, error } = await admin
        .from("talent_pool_entries")
        .select(`
            id,
            notes,
            tags,
            created_at,
            candidate:candidates(
                id, first_name, last_name, current_title, current_company,
                years_experience, status, ai_match_score, created_at,
                job:jobs(id, title)
            ),
            application:applications(
                id, full_name, created_at, status,
                screening:ai_screenings(match_score, analysis_json)
            )
        `)
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: "Failed to fetch talent pool" }, { status: 500 });
    }

    return NextResponse.json({ entries: entries ?? [] });
}

const addSchema = z.object({
    candidateId: z.string().uuid().optional(),
    applicationId: z.string().uuid().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
});

// POST /api/talent-pool — add entry
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const parsed = addSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const { candidateId, applicationId, notes, tags } = parsed.data;
    if (!candidateId && !applicationId) {
        return NextResponse.json({ error: "candidateId or applicationId required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: company } = await admin
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 403 });

    // IDOR guard: the candidate/application must belong to one of this company's
    // jobs before it can be added to the company's talent pool.
    if (candidateId) {
        const { data: cand } = await admin
            .from("candidates")
            .select("id, job:jobs(company_id)")
            .eq("id", candidateId)
            .single();
        const candJob = Array.isArray(cand?.job) ? cand.job[0] : cand?.job;
        if (!cand || (candJob as { company_id?: string } | undefined)?.company_id !== company.id) {
            return NextResponse.json({ error: "Candidate not found" }, { status: 403 });
        }
    }
    if (applicationId) {
        const { data: app } = await admin
            .from("applications")
            .select("id, job:jobs(company_id)")
            .eq("id", applicationId)
            .single();
        const appJob = Array.isArray(app?.job) ? app.job[0] : app?.job;
        if (!app || (appJob as { company_id?: string } | undefined)?.company_id !== company.id) {
            return NextResponse.json({ error: "Application not found" }, { status: 403 });
        }
    }

    const { data, error } = await admin
        .from("talent_pool_entries")
        .insert({
            company_id: company.id,
            candidate_id: candidateId ?? null,
            application_id: applicationId ?? null,
            added_by: user.id,
            notes: notes ?? null,
            tags: tags ?? [],
        })
        .select("id")
        .single();

    if (error) {
        if (error.code === "23505") {
            return NextResponse.json({ error: "Already in talent pool" }, { status: 409 });
        }
        return NextResponse.json({ error: "Failed to add to talent pool" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id });
}

// DELETE /api/talent-pool?entryId=...
export async function DELETE(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const entryId = request.nextUrl.searchParams.get("entryId");
    if (!entryId) return NextResponse.json({ error: "entryId required" }, { status: 400 });

    const admin = createAdminClient();
    const { data: company } = await admin
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 403 });

    const { error } = await admin
        .from("talent_pool_entries")
        .delete()
        .eq("id", entryId)
        .eq("company_id", company.id);

    if (error) return NextResponse.json({ error: "Failed to remove entry" }, { status: 500 });

    return NextResponse.json({ ok: true });
}
