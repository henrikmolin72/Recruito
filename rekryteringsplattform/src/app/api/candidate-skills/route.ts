import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function getCallerContext(userId: string, admin: ReturnType<typeof createAdminClient>) {
    const { data: profile } = await admin.from("profiles").select("role").eq("id", userId).single();
    if (profile?.role === "admin") return { recruiterId: null as string | null, isAdmin: true };

    const { data: recruiter } = await admin.from("recruiters").select("id").eq("user_id", userId).single();
    return { recruiterId: (recruiter?.id as string) ?? null, isAdmin: false };
}

async function ownsCandidate(candidateId: string, recruiterId: string, admin: ReturnType<typeof createAdminClient>) {
    const { data } = await admin.from("candidates").select("recruiter_id").eq("id", candidateId).single();
    return data?.recruiter_id === recruiterId;
}

// GET /api/candidate-skills?candidateId=...
export async function GET(request: NextRequest) {
    const candidateId = request.nextUrl.searchParams.get("candidateId");
    if (!candidateId) return NextResponse.json({ error: "candidateId required" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const admin = createAdminClient();
    const { recruiterId, isAdmin } = await getCallerContext(user.id, admin);

    if (!isAdmin) {
        if (!recruiterId || !(await ownsCandidate(candidateId, recruiterId, admin))) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
    }

    const { data, error } = await admin
        .from("candidate_skills")
        .select("id, skill_id, source, is_gap, skill:skills(id, name, slug, category)")
        .eq("candidate_id", candidateId);

    if (error) return NextResponse.json({ error: "Failed to fetch skills" }, { status: 500 });

    return NextResponse.json({ skills: data ?? [] });
}

const addSchema = z.object({
    candidateId: z.string().uuid(),
    skillId: z.string().uuid(),
    isGap: z.boolean().default(false),
});

// POST /api/candidate-skills — add a skill tag
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const parsed = addSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const { candidateId, skillId, isGap } = parsed.data;
    const admin = createAdminClient();
    const { recruiterId, isAdmin } = await getCallerContext(user.id, admin);

    if (!isAdmin) {
        if (!recruiterId || !(await ownsCandidate(candidateId, recruiterId, admin))) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
    }

    const { error } = await admin.from("candidate_skills").upsert(
        { candidate_id: candidateId, skill_id: skillId, source: "manual", is_gap: isGap },
        { onConflict: "candidate_id,skill_id", ignoreDuplicates: true }
    );

    if (error) return NextResponse.json({ error: "Failed to add skill" }, { status: 500 });
    return NextResponse.json({ ok: true });
}

// DELETE /api/candidate-skills?candidateId=...&skillId=...
export async function DELETE(request: NextRequest) {
    const candidateId = request.nextUrl.searchParams.get("candidateId");
    const skillId = request.nextUrl.searchParams.get("skillId");
    if (!candidateId || !skillId) return NextResponse.json({ error: "candidateId and skillId required" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const admin = createAdminClient();
    const { recruiterId, isAdmin } = await getCallerContext(user.id, admin);

    if (!isAdmin) {
        if (!recruiterId || !(await ownsCandidate(candidateId, recruiterId, admin))) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
    }

    const { error } = await admin.from("candidate_skills")
        .delete()
        .eq("candidate_id", candidateId)
        .eq("skill_id", skillId);

    if (error) return NextResponse.json({ error: "Failed to remove skill" }, { status: 500 });
    return NextResponse.json({ ok: true });
}
