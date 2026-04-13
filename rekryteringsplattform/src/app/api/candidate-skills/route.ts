import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// GET /api/candidate-skills?candidateId=...
export async function GET(request: NextRequest) {
    const candidateId = request.nextUrl.searchParams.get("candidateId");
    if (!candidateId) return NextResponse.json({ error: "candidateId required" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const admin = createAdminClient();
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
    const { error } = await admin.from("candidate_skills")
        .delete()
        .eq("candidate_id", candidateId)
        .eq("skill_id", skillId);

    if (error) return NextResponse.json({ error: "Failed to remove skill" }, { status: 500 });
    return NextResponse.json({ ok: true });
}
